import { NextRequest, NextResponse } from 'next/server';
import { getMockResponse, toolDefinitions, formatToolNarrative } from '@/lib/tools';
import { sanitizeMessages } from './messageSanitizer';
import { executeToolCall, type ToolExecutionResult } from '@/lib/toolExecutors';
import type { Message, ToolCall, ChatStreamEvent } from '@/types/types';

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

// One-shot warnings: logging on every request just floods serverless logs.
const warnedOnce = new Set<string>();
function warnOnce(key: string, message: string) {
  if (warnedOnce.has(key)) return;
  warnedOnce.add(key);
  console.warn(message);
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
    // capped at the window; an empty-content final user turn survives when an
    // image is attached (image-only send).
    const sanitizedMessages: Message[] = sanitizeMessages(
      messages,
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

    // 3. Dispatch to provider — every path streams NDJSON events. The request
    // signal is threaded through so a client disconnect also cancels the
    // upstream provider call instead of streaming it into the void.
    switch (AI_PROVIDER) {
      case 'gemini':
        if (!GEMINI_API_KEY) {
          warnOnce('gemini-key', 'GEMINI_API_KEY is not configured. Falling back to mock engine.');
          return streamNdjson(
            streamMock(sanitizedMessages, true, 'Gemini API key not configured'),
            request.signal
          );
        }
        return streamNdjson(
          streamGemini(sanitizedMessages, validatedImage, request.signal),
          request.signal
        );

      case 'groq': {
        if (!GROQ_API_KEY) {
          warnOnce('groq-key', 'GROQ_API_KEY is not configured. Falling back to mock engine.');
          return streamNdjson(
            streamMock(sanitizedMessages, true, 'Groq API key not configured'),
            request.signal
          );
        }
        return streamNdjson(
          streamGroq(sanitizedMessages, request.signal, {
            droppedImage: validatedImage !== undefined,
          }),
          request.signal
        );
      }

      case 'mock':
      default:
        return streamNdjson(streamMock(sanitizedMessages, false), request.signal);
    }
  } catch (error) {
    console.error('Chat API unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing assistant request' },
      { status: 500 }
    );
  }
}

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

// ─── NDJSON stream plumbing ───

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function streamNdjson(events: AsyncGenerator<ChatStreamEvent>, requestSignal?: AbortSignal): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of events) {
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
        }
      } catch (err) {
        if (!requestSignal?.aborted) {
          console.error('Chat stream crashed:', err);
        }
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
    // Client disconnected — stop pulling from the provider upstream. The
    // generator is queued a return, which runs its cleanup once the current
    // await settles (the aborted fetch makes that immediate).
    cancel() {
      void events.return(undefined);
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

// ─── Tool execution (server-side, shared by every provider path) ───

interface ExecutedTool {
  call: ToolCall;
  result: ToolExecutionResult;
}

// Emits the announce/execute/report event trio for each tool call. Execution
// happens on the server so results are real (or honestly simulated) and the
// model can be told what actually happened. Populates `executedOut` as it
// runs so callers can feed the same outcomes into the round-trip.
async function* emitToolExecution(
  toolCalls: ToolCall[],
  executedOut: ExecutedTool[]
): AsyncGenerator<ChatStreamEvent> {
  for (const call of toolCalls) {
    yield { type: 'tool', toolCall: { ...call, status: 'executing' } };
    const result = executeToolCall(call);
    executedOut.push({ call, result });
    yield {
      type: 'tool_result',
      toolCallId: call.id,
      ok: result.ok,
      message: result.message,
      ics: result.ics,
      simulated: result.simulated,
    };
  }
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
        response: "Hello! I'm Voxelle, your ambient voice AI co-pilot. How can I help you?",
        toolCalls: undefined,
      };

  yield { type: 'meta', provider: 'mock', degraded, reason: degradedReason };

  if (result.toolCalls) {
    // Demo mode runs the same server-side executors as live providers — the
    // .ics download in the demo is the real artifact.
    for await (const event of emitToolExecution(result.toolCalls, [])) {
      yield event;
    }
  }

  // Stream in small word groups so demo mode feels like live generation
  const words = result.response.split(' ');
  for (let i = 0; i < words.length; i += 3) {
    const isLastGroup = i + 3 >= words.length;
    yield {
      type: 'delta',
      text: words.slice(i, 3 + i).join(' ') + (isLastGroup ? '' : ' '),
    };
    await sleep(30);
  }

  yield { type: 'done' };
}

// ─── Gemini Handler (Google AI Studio, SSE streaming) ───

class ProviderHttpError extends Error {
  constructor(
    public provider: string,
    public status: number
  ) {
    super(`${provider} HTTP ${status}`);
  }
}

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } }
  | { functionCall: GeminiFunctionCall }
  | { functionResponse: { name: string; response: { result: string } } };
type GeminiFunctionCall = { name: string; args?: unknown };

// Normalized items from one Gemini streaming turn.
interface GeminiTurnItem {
  text?: string;
  functionCall?: GeminiFunctionCall;
  finishReason?: string;
}

const GEMINI_SYSTEM_INSTRUCTION = `You are Voxelle, a helpful voice-enabled multimodal AI assistant and ambient co-pilot. You can:
1. Have natural, concise conversations suited for voice synthesis.
2. Schedule calendar events using the add_calendar_event tool.
3. Control smart home devices using the toggle_smart_home_device tool.
4. Analyze images when provided.

Keep your responses natural, conversational, and direct since they may be spoken aloud.`;

function toGeminiContents(messages: Message[], image?: string): Array<{ role: string; parts: GeminiPart[] }> {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: m.content ? [{ text: m.content } as GeminiPart] : [],
  }));

  // Attach image to the most recent user turn
  if (image && contents.length > 0) {
    const lastMsg = contents[contents.length - 1];
    if (lastMsg.role === 'user') {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        lastMsg.parts.push({
          inline_data: {
            mime_type: match[1],
            data: match[2],
          },
        });
      }
    }
  }
  return contents;
}

// One streaming turn against Gemini. Throws ProviderHttpError before any
// output when the request itself fails, so callers can fall back cleanly.
async function* geminiTurn(
  contents: Array<{ role: string; parts: GeminiPart[] }>,
  signal: AbortSignal,
  includeTools: boolean
): AsyncGenerator<GeminiTurnItem> {
  const geminiBody: Record<string, unknown> = {
    contents,
    system_instruction: { parts: [{ text: GEMINI_SYSTEM_INSTRUCTION }] },
    generationConfig: { temperature: 0.7, topP: 0.95, maxOutputTokens: 512 },
  };
  if (includeTools) {
    geminiBody.tools = [{ function_declarations: toolDefinitions }];
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify(geminiBody),
      signal,
    }
  );

  if (!res.ok || !res.body) {
    const errorText = await res.text().catch(() => '');
    console.error('Gemini API call failed:', res.status, errorText);
    throw new ProviderHttpError('Gemini', res.status);
  }

  for await (const payload of parseSse(res.body)) {
    let chunk: {
      candidates?: Array<{
        finishReason?: string;
        content?: { parts?: Array<{ text?: string; functionCall?: GeminiFunctionCall }> };
      }>;
    };
    try {
      chunk = JSON.parse(payload);
    } catch {
      continue;
    }

    const candidate = chunk.candidates?.[0];
    const item: GeminiTurnItem = {};
    if (candidate?.finishReason) item.finishReason = candidate.finishReason;
    const parts = candidate?.content?.parts;
    if (Array.isArray(parts) && parts.length > 0) {
      const part = parts[0];
      if (typeof part.text === 'string' && part.text) item.text = part.text;
      else if (part.functionCall) item.functionCall = part.functionCall;
    }
    if (item.text || item.functionCall || item.finishReason) yield item;
  }
}

async function* streamGemini(
  messages: Message[],
  image: string | undefined,
  requestSignal: AbortSignal
): AsyncGenerator<ChatStreamEvent> {
  // One budget across both the initial turn and the tool round-trip so a
  // chatty agentic exchange can't double the function runtime.
  const deadline = AbortSignal.timeout(30_000);
  const signal = () => AbortSignal.any([requestSignal, deadline]);

  try {
    const contents = toGeminiContents(messages, image);
    let finishReason: string | undefined;
    let hasText = false;
    const toolCalls: ToolCall[] = [];
    // Echoed model turn for the round-trip: text and functionCall parts.
    const modelParts: GeminiPart[] = [];

    yield { type: 'meta', provider: 'gemini', degraded: false };

    for await (const item of geminiTurn(contents, signal(), true)) {
      if (item.finishReason) finishReason = item.finishReason;
      if (item.text) {
        hasText = true;
        modelParts.push({ text: item.text });
        yield { type: 'delta', text: item.text };
      } else if (item.functionCall) {
        modelParts.push({ functionCall: item.functionCall });
        toolCalls.push({
          id: `tool_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          name: item.functionCall.name,
          arguments: (item.functionCall.args || {}) as ToolCall['arguments'],
          status: 'executing',
        });
      }
    }

    if (toolCalls.length > 0) {
      // Execute server-side and report real outcomes.
      const executed: ExecutedTool[] = [];
      for await (const event of emitToolExecution(toolCalls, executed)) {
        yield event;
      }

      // Round-trip: hand the outcomes back so the model confirms with a
      // grounded reply instead of the client inventing one. Tools are
      // withheld on this turn — exactly one round-trip, bounded latency.
      try {
        const roundTripContents = [
          ...contents,
          { role: 'model', parts: modelParts },
          {
            role: 'user',
            parts: executed.map(({ call, result }) => ({
              functionResponse: {
                name: call.name,
                response: { result: result.message },
              },
            })),
          },
        ];
        for await (const item of geminiTurn(roundTripContents, signal(), false)) {
          if (item.finishReason) finishReason = item.finishReason;
          if (item.text) {
            hasText = true;
            yield { type: 'delta', text: item.text };
          }
        }
      } catch (err) {
        if (requestSignal.aborted || deadline.aborted) return;
        console.error('Gemini tool round-trip failed:', err);
        // The tool DID run — fall through to the narrative below.
      }

      if (!hasText) {
        yield { type: 'delta', text: executed.map(({ call }) => formatToolNarrative(call)).join(' ') };
      }
    }

    yield { type: 'done', finishReason };
  } catch (err) {
    if (requestSignal.aborted) return; // client left; nothing to report
    if (err instanceof ProviderHttpError) {
      yield* streamMock(messages, true, `Gemini error (HTTP ${err.status})`);
      return;
    }
    console.error('Gemini stream exception:', err);
    yield {
      type: 'error',
      message: 'The Gemini stream failed. Please try again.',
    };
    yield { type: 'done' };
  }
}

// ─── Groq Handler (OpenAI-compatible SSE streaming) ───

interface GroqTurnItem {
  text?: string;
  toolCallDelta?: { index: number; id?: string; name?: string; args?: string };
  finishReason?: string;
}

const GROQ_SYSTEM_PROMPT =
  'You are Voxelle, a helpful voice-enabled AI assistant and ambient co-pilot. Keep responses concise and conversational since they are spoken aloud.';

async function* groqTurn(
  messages: Array<Record<string, unknown>>,
  signal: AbortSignal,
  includeTools: boolean
): AsyncGenerator<GroqTurnItem> {
  const groqTools = toolDefinitions.map((td) => ({
    type: 'function' as const,
    function: {
      name: td.name,
      description: td.description,
      parameters: td.parameters,
    },
  }));

  const body: Record<string, unknown> = {
    model: GROQ_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 512,
    stream: true,
  };
  if (includeTools) {
    body.tools = groqTools;
    body.tool_choice = 'auto';
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    signal,
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const errorText = await res.text().catch(() => '');
    console.error('Groq API call failed:', res.status, errorText);
    throw new ProviderHttpError('Groq', res.status);
  }

  for await (const payload of parseSse(res.body)) {
    if (payload === '[DONE]') break;

    let chunk: {
      choices?: Array<{
        finish_reason?: string | null;
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

    const choice = chunk.choices?.[0];
    const item: GroqTurnItem = {};
    if (choice?.finish_reason) {
      item.finishReason =
        choice.finish_reason === 'length'
          ? 'MAX_TOKENS'
          : choice.finish_reason === 'tool_calls'
            ? 'TOOL_CALLS'
            : 'STOP';
    }
    if (choice?.delta?.content) item.text = choice.delta.content;
    if (choice?.delta?.tool_calls?.length) {
      // Only the first tool call per delta matters for our single-tool flows;
      // fragments arrive split across chunks with a stable index.
      const tc = choice.delta.tool_calls[0];
      item.toolCallDelta = {
        index: tc.index,
        id: tc.id,
        name: tc.function?.name,
        args: tc.function?.arguments,
      };
    }
    if (item.text || item.toolCallDelta || item.finishReason) yield item;
  }
}

async function* streamGroq(
  messages: Message[],
  requestSignal: AbortSignal,
  options?: { droppedImage?: boolean }
): AsyncGenerator<ChatStreamEvent> {
  const deadline = AbortSignal.timeout(30_000);
  const signal = () => AbortSignal.any([requestSignal, deadline]);

  try {
    const baseMessages: Array<Record<string, unknown>> = [
      { role: 'system', content: GROQ_SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: m.role,
        // Groq's text models require non-empty content; image-only turns get a
        // placeholder (images are only routed to the multimodal provider).
        content: m.content || '[user attached an image]',
      })),
    ];

    yield {
      type: 'meta',
      provider: 'groq',
      degraded: false,
      notice: options?.droppedImage
        ? 'This text-only provider cannot see the attached image; it was not sent.'
        : undefined,
    };

    let hasText = false;
    let firstText = '';
    let finishReason: string | undefined;
    // Groq fragments tool calls across chunks; aggregate by index until done.
    const toolAccumulators = new Map<number, { id?: string; name?: string; args: string }>();

    for await (const item of groqTurn(baseMessages, signal(), true)) {
      if (item.finishReason) finishReason = item.finishReason;
      if (item.text) {
        hasText = true;
        firstText += item.text;
        yield { type: 'delta', text: item.text };
      }
      if (item.toolCallDelta) {
        const d = item.toolCallDelta;
        const acc = toolAccumulators.get(d.index) ?? { args: '' };
        if (d.id) acc.id = d.id;
        if (d.name) acc.name = d.name;
        if (d.args) acc.args += d.args;
        toolAccumulators.set(d.index, acc);
      }
    }

    if (toolAccumulators.size > 0) {
      const toolCalls: ToolCall[] = [];
      for (const acc of toolAccumulators.values()) {
        let parsedArgs: ToolCall['arguments'] = {};
        try {
          parsedArgs = JSON.parse(acc.args || '{}') as ToolCall['arguments'];
        } catch {
          parsedArgs = {};
        }
        toolCalls.push({
          id: acc.id || `tool_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          name: acc.name || 'unknown_tool',
          arguments: parsedArgs,
          status: 'executing',
        });
      }

      // Execute server-side and report real outcomes.
      const executed: ExecutedTool[] = [];
      for await (const event of emitToolExecution(toolCalls, executed)) {
        yield event;
      }

      // Round-trip: echo the assistant's tool_calls, then reply with the
      // execution outcomes so the confirmation is grounded. Tools are
      // withheld on this turn — exactly one round-trip.
      try {
        const roundTripMessages: Array<Record<string, unknown>> = [
          ...baseMessages,
          {
            role: 'assistant',
            content: firstText || null,
            tool_calls: toolCalls.map((tc) => ({
              id: tc.id,
              type: 'function',
              function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
            })),
          },
          ...executed.map(({ call, result }) => ({
            role: 'tool',
            tool_call_id: call.id,
            content: result.message,
          })),
        ];
        for await (const item of groqTurn(roundTripMessages, signal(), false)) {
          if (item.finishReason) finishReason = item.finishReason;
          if (item.text) {
            hasText = true;
            yield { type: 'delta', text: item.text };
          }
        }
      } catch (err) {
        if (requestSignal.aborted || deadline.aborted) return;
        console.error('Groq tool round-trip failed:', err);
        // The tool DID run — fall through to the narrative below.
      }

      if (!hasText) {
        yield { type: 'delta', text: executed.map(({ call }) => formatToolNarrative(call)).join(' ') };
      }
    }

    yield { type: 'done', finishReason };
  } catch (err) {
    if (requestSignal.aborted) return; // client left; nothing to report
    if (err instanceof ProviderHttpError) {
      yield* streamMock(messages, true, `Groq error (HTTP ${err.status})`);
      return;
    }
    console.error('Groq stream exception:', err);
    yield {
      type: 'error',
      message: 'The Groq stream failed. Please try again.',
    };
    yield { type: 'done' };
  }
}
