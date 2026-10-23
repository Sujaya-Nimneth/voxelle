import { NextRequest, NextResponse } from 'next/server';
import { getMockResponse, toolDefinitions } from './tools';
import { sanitizeMessages } from './messageSanitizer';
import type { Message, ToolCall, ToolCallArgs, ChatStreamEvent } from '@/types/types';

// ─── Configuration ───
const AI_PROVIDER = (process.env.AI_PROVIDER || 'mock').toLowerCase();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// ─── Rate Limiter (Token bucket per client IP) ───
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const client = rateLimitMap.get(ip);

  // Periodically clean up stale records to prevent memory leak
  if (rateLimitMap.size > 2000) {
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!client || now > client.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (client.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  client.count += 1;
  return true;
}

// ─── Input Validation ───
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);
const MAX_IMAGE_BASE64_LENGTH = 7 * 1024 * 1024; // ~5MB file size

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting Check
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'anonymous-client';

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a minute before sending more signals.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // 2. Body Parsing & Validation
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { messages, image } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload: messages must be a non-empty array' },
        { status: 400 }
      );
    }

    // Sanitize and filter messages: retain only user and assistant messages,
    // capped at last 20; an empty-content final user turn survives when an
    // image is attached (image-only send).
    const sanitizedMessages: Message[] = sanitizeMessages(
      messages as Message[],
      typeof image === 'string' && image.length > 0
    );

    if (sanitizedMessages.length === 0) {
      return NextResponse.json(
        { error: 'No valid user or assistant messages provided' },
        { status: 400 }
      );
    }

    // Validate optional image data URI
    let validatedImage: string | undefined = undefined;
    if (typeof image === 'string' && image.length > 0) {
      if (image.length > MAX_IMAGE_BASE64_LENGTH) {
        return NextResponse.json(
          { error: 'Image payload exceeds maximum allowed size (5MB limit)' },
          { status: 413 }
        );
      }

      const match = image.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
      if (!match || !ALLOWED_MIME_TYPES.has(match[1].toLowerCase())) {
        return NextResponse.json(
          { error: 'Invalid image format. Allowed formats: PNG, JPEG, WebP, GIF' },
          { status: 400 }
        );
      }
      validatedImage = image;
    }

    // 3. Dispatch to provider — every path streams NDJSON events
    switch (AI_PROVIDER) {
      case 'gemini':
        if (!GEMINI_API_KEY) {
          console.warn('GEMINI_API_KEY is not configured. Falling back to mock engine.');
          return streamNdjson(
            streamMock(sanitizedMessages, true, 'Gemini API key not configured')
          );
        }
        return streamNdjson(streamGemini(sanitizedMessages, validatedImage));

      case 'groq':
        if (!GROQ_API_KEY) {
          console.warn('GROQ_API_KEY is not configured. Falling back to mock engine.');
          return streamNdjson(
            streamMock(sanitizedMessages, true, 'Groq API key not configured')
          );
        }
        return streamNdjson(streamGroq(sanitizedMessages));

      case 'mock':
      default:
        return streamNdjson(streamMock(sanitizedMessages, false));
    }
  } catch (error) {
    console.error('Chat API unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing assistant request' },
      { status: 500 }
    );
  }
}

// ─── NDJSON stream plumbing ───

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function streamNdjson(events: AsyncGenerator<ChatStreamEvent>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of events) {
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
        }
      } catch (err) {
        console.error('Chat stream crashed:', err);
        try {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: 'error', message: 'The assistant stream failed.' }) + '\n'
            )
          );
        } catch {
          // Client already disconnected
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no', // don't let proxies buffer the stream
    },
  });
}

// Parses an upstream SSE body (`data: {json}` lines), yielding each payload.
async function* parseSse(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload) yield payload;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// Contextual narrative when a tool was invoked with no accompanying text.
function narrativeForToolCall(tc: ToolCall): string {
  if (tc.name === 'add_calendar_event') {
    return `I've scheduled "${tc.arguments.title}" for ${tc.arguments.date} at ${tc.arguments.time}.`;
  }
  if (tc.name === 'toggle_smart_home_device') {
    return `I've turned ${tc.arguments.state} the ${tc.arguments.device_name}.`;
  }
  return `I've executed ${tc.name.replace(/_/g, ' ')}.`;
}

// ─── Mock Handler (demo mode / degraded fallback) ───

async function* streamMock(
  messages: Message[],
  degraded: boolean,
  degradedReason?: string
): AsyncGenerator<ChatStreamEvent> {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');

  const result = lastUserMessage
    ? getMockResponse(lastUserMessage.content)
    : {
        response:
          "Hello! I'm Voxelle, your ambient voice AI co-pilot. How can I help you?",
        toolCalls: undefined,
      };

  yield { type: 'meta', provider: 'mock', degraded, reason: degradedReason };

  if (result.toolCalls) {
    for (const tc of result.toolCalls) {
      yield { type: 'tool', toolCall: tc };
    }
  }

  // Stream in small word groups so demo mode feels like live generation
  const words = result.response.split(' ');
  for (let i = 0; i < words.length; i += 3) {
    const isLastGroup = i + 3 >= words.length;
    yield {
      type: 'delta',
      text: words.slice(i, i + 3).join(' ') + (isLastGroup ? '' : ' '),
    };
    await sleep(30);
  }

  yield { type: 'done' };
}

// ─── Gemini Handler (Google AI Studio, SSE streaming) ───

async function* streamGemini(
  messages: Message[],
  image?: string
): AsyncGenerator<ChatStreamEvent> {
  try {
    // Image-only turns have empty text; don't emit empty text parts.
    const geminiMessages = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: m.content ? [{ text: m.content }] : [],
    }));

    // Attach image to the most recent user turn
    if (image && geminiMessages.length > 0) {
      const lastMsg = geminiMessages[geminiMessages.length - 1];
      if (lastMsg.role === 'user') {
        const match = image.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          lastMsg.parts.push({
            inline_data: {
              mime_type: match[1],
              data: match[2],
            },
          } as never);
        }
      }
    }

    const geminiBody = {
      contents: geminiMessages,
      tools: [
        {
          function_declarations: toolDefinitions,
        },
      ],
      system_instruction: {
        parts: [
          {
            text: `You are Voxelle, a helpful voice-enabled multimodal AI assistant and ambient co-pilot. You can:
1. Have natural, concise conversations suited for voice synthesis.
2. Schedule calendar events using the add_calendar_event tool.
3. Control smart home devices using the toggle_smart_home_device tool.
4. Analyze images when provided.

Keep your responses natural, conversational, and direct since they may be spoken aloud.`,
          },
        ],
      },
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 512,
      },
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify(geminiBody),
        // Don't let the serverless function burn until the platform timeout
        // if the provider hangs; the client gives up long before this.
        signal: AbortSignal.timeout(30_000),
      }
    );

    if (!res.ok || !res.body) {
      const errorText = await res.text().catch(() => '');
      console.error('Gemini API call failed:', res.status, errorText);
      yield* streamMock(messages, true, `Gemini error (HTTP ${res.status})`);
      return;
    }

    yield { type: 'meta', provider: 'gemini', degraded: false };

    let hasText = false;
    const toolCalls: ToolCall[] = [];

    for await (const payload of parseSse(res.body)) {
      let chunk: {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string; functionCall?: { name: string; args?: unknown } }> };
        }>;
      };
      try {
        chunk = JSON.parse(payload);
      } catch {
        continue;
      }

      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!Array.isArray(parts)) continue;

      for (const part of parts) {
        if (typeof part.text === 'string' && part.text) {
          hasText = true;
          yield { type: 'delta', text: part.text };
        } else if (part.functionCall) {
          toolCalls.push({
            id: `tool_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            name: part.functionCall.name,
            arguments: (part.functionCall.args || {}) as ToolCallArgs,
            status: 'pending',
          });
        }
      }
    }

    for (const tc of toolCalls) {
      yield { type: 'tool', toolCall: tc };
    }

    if (toolCalls.length > 0 && !hasText) {
      yield { type: 'delta', text: toolCalls.map(narrativeForToolCall).join(' ') };
    }

    yield { type: 'done' };
  } catch (err) {
    console.error('Gemini stream exception:', err);
    yield {
      type: 'error',
      message: 'The Gemini stream failed. Please try again.',
    };
    yield { type: 'done' };
  }
}

// ─── Groq Handler (OpenAI-compatible SSE streaming) ───

async function* streamGroq(messages: Message[]): AsyncGenerator<ChatStreamEvent> {
  try {
    const groqMessages = [
      {
        role: 'system',
        content: `You are Voxelle, a helpful voice-enabled AI assistant and ambient co-pilot. Keep responses concise and conversational since they are spoken aloud.`,
      },
      ...messages.map((m) => ({
        role: m.role,
        // Groq's text models require non-empty content; image-only turns get a
        // placeholder (images are only routed to the multimodal provider).
        content: m.content || '[user attached an image]',
      })),
    ];

    const groqTools = toolDefinitions.map((td) => ({
      type: 'function' as const,
      function: {
        name: td.name,
        description: td.description,
        parameters: td.parameters,
      },
    }));

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: groqMessages,
        tools: groqTools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 512,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      const errorText = await res.text().catch(() => '');
      console.error('Groq API call failed:', res.status, errorText);
      yield* streamMock(messages, true, `Groq error (HTTP ${res.status})`);
      return;
    }

    yield { type: 'meta', provider: 'groq', degraded: false };

    let hasText = false;
    // Groq fragments tool calls across chunks; aggregate by index until done.
    const toolAccumulators = new Map<
      number,
      { id?: string; name?: string; args: string }
    >();

    for await (const payload of parseSse(res.body)) {
      if (payload === '[DONE]') break;

      let chunk: {
        choices?: Array<{
          delta?: {
            content?: string;
            tool_calls?: Array<{
              index: number;
              id?: string;
              function?: { name?: string; arguments?: string };
            }>;
          };
        }>;
      };
      try {
        chunk = JSON.parse(payload);
      } catch {
        continue;
      }

      const delta = chunk.choices?.[0]?.delta;
      if (!delta) continue;

      if (typeof delta.content === 'string' && delta.content) {
        hasText = true;
        yield { type: 'delta', text: delta.content };
      }

      if (Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls) {
          const acc = toolAccumulators.get(tc.index) ?? { args: '' };
          if (tc.id) acc.id = tc.id;
          if (tc.function?.name) acc.name = tc.function.name;
          if (tc.function?.arguments) acc.args += tc.function.arguments;
          toolAccumulators.set(tc.index, acc);
        }
      }
    }

    const toolCalls: ToolCall[] = [];
    for (const acc of toolAccumulators.values()) {
      let parsedArgs: ToolCallArgs = {};
      try {
        parsedArgs = JSON.parse(acc.args || '{}') as ToolCallArgs;
      } catch {
        parsedArgs = {};
      }
      toolCalls.push({
        id: acc.id || `tool_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: acc.name || 'unknown_tool',
        arguments: parsedArgs,
        status: 'pending',
      });
    }

    for (const tc of toolCalls) {
      yield { type: 'tool', toolCall: tc };
    }

    if (toolCalls.length > 0 && !hasText) {
      yield { type: 'delta', text: toolCalls.map(narrativeForToolCall).join(' ') };
    }

    yield { type: 'done' };
  } catch (err) {
    console.error('Groq stream exception:', err);
    yield {
      type: 'error',
      message: 'The Groq stream failed. Please try again.',
    };
    yield { type: 'done' };
  }
}
