import { NextRequest, NextResponse } from 'next/server';
import { getMockResponse, toolDefinitions } from './tools';
import type { Message, ToolCall, ToolCallArgs } from '@/types/types';

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
const MAX_MESSAGES_COUNT = 20;
const MAX_MESSAGE_CONTENT_LENGTH = 4000;

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

    // Sanitize and filter messages: retain only user and assistant messages, capped at last 20
    const sanitizedMessages: Message[] = messages
      .slice(-MAX_MESSAGES_COUNT)
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
      .map((m) => ({
        id: typeof m.id === 'string' ? m.id : `msg_${Date.now()}`,
        role: m.role as 'user' | 'assistant',
        content: typeof m.content === 'string' ? m.content.slice(0, MAX_MESSAGE_CONTENT_LENGTH) : '',
        timestamp: typeof m.timestamp === 'number' ? m.timestamp : Date.now(),
      }))
      .filter((m) => m.content.trim().length > 0);

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

    // 3. Dispatch to Provider
    switch (AI_PROVIDER) {
      case 'gemini':
        if (!GEMINI_API_KEY) {
          console.warn('GEMINI_API_KEY is not configured. Falling back to mock engine.');
          return handleMock(sanitizedMessages, true);
        }
        return await handleGemini(sanitizedMessages, validatedImage);

      case 'groq':
        if (!GROQ_API_KEY) {
          console.warn('GROQ_API_KEY is not configured. Falling back to mock engine.');
          return handleMock(sanitizedMessages, true);
        }
        return await handleGroq(sanitizedMessages);

      case 'mock':
      default:
        return handleMock(sanitizedMessages, false);
    }
  } catch (error) {
    console.error('Chat API unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing assistant request' },
      { status: 500 }
    );
  }
}

// ─── Mock Handler ───
function handleMock(messages: Message[], degraded = false) {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');

  if (!lastUserMessage) {
    return NextResponse.json({
      response: "Hello! I'm Voxelle, your ambient voice AI co-pilot. How can I help you?",
      provider: 'mock',
      degraded,
    });
  }

  const result = getMockResponse(lastUserMessage.content);
  return NextResponse.json({
    ...result,
    provider: 'mock',
    degraded,
  });
}

// ─── Gemini Handler (Google AI Studio) ───
async function handleGemini(messages: Message[], image?: string) {
  try {
    const geminiMessages = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
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
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify(geminiBody),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Gemini API call failed:', res.status, errorText);
      return handleMock(messages, true);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];

    if (!candidate?.content?.parts) {
      return handleMock(messages, true);
    }

    let responseText = '';
    const toolCalls: ToolCall[] = [];

    for (const part of candidate.content.parts) {
      if (part.text) {
        responseText += part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          id: `tool_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          name: part.functionCall.name,
          arguments: (part.functionCall.args || {}) as ToolCallArgs,
          status: 'pending',
        });
      }
    }

    // Contextual text fallback if tool was invoked with no narrative
    if (toolCalls.length > 0 && !responseText.trim()) {
      responseText = toolCalls
        .map((tc) => {
          if (tc.name === 'add_calendar_event') {
            return `I've scheduled "${tc.arguments.title}" for ${tc.arguments.date} at ${tc.arguments.time}.`;
          }
          if (tc.name === 'toggle_smart_home_device') {
            return `I've turned ${tc.arguments.state} the ${tc.arguments.device_name}.`;
          }
          return `I've executed ${tc.name.replace(/_/g, ' ')}.`;
        })
        .join(' ');
    }

    return NextResponse.json({
      response: responseText || "I'm not sure how to respond to that. Could you try rephrasing?",
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      provider: 'gemini',
      degraded: false,
    });
  } catch (err) {
    console.error('Gemini handler exception:', err);
    return handleMock(messages, true);
  }
}

// ─── Groq Handler (Fast Inference) ───
async function handleGroq(messages: Message[]) {
  try {
    const groqMessages = [
      {
        role: 'system',
        content: `You are Voxelle, a helpful voice-enabled AI assistant and ambient co-pilot. Keep responses concise and conversational since they are spoken aloud.`,
      },
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
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
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: groqMessages,
        tools: groqTools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 512,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Groq API call failed:', res.status, errorText);
      return handleMock(messages, true);
    }

    const data = await res.json();
    const choice = data.choices?.[0];

    if (!choice?.message) {
      return handleMock(messages, true);
    }

    const responseText = choice.message.content || '';
    const toolCalls: ToolCall[] = [];

    if (Array.isArray(choice.message.tool_calls)) {
      for (const tc of choice.message.tool_calls) {
        let parsedArgs: ToolCallArgs = {};
        if (typeof tc.function?.arguments === 'string') {
          try {
            parsedArgs = JSON.parse(tc.function.arguments);
          } catch {
            parsedArgs = {};
          }
        } else if (tc.function?.arguments && typeof tc.function.arguments === 'object') {
          parsedArgs = tc.function.arguments as ToolCallArgs;
        }

        toolCalls.push({
          id: tc.id || `tool_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          name: tc.function?.name || 'unknown_tool',
          arguments: parsedArgs,
          status: 'pending',
        });
      }
    }

    let finalResponse = responseText;
    if (toolCalls.length > 0 && !finalResponse.trim()) {
      finalResponse = toolCalls
        .map((tc) => {
          if (tc.name === 'add_calendar_event') {
            return `I've scheduled "${tc.arguments.title}" for ${tc.arguments.date} at ${tc.arguments.time}.`;
          }
          if (tc.name === 'toggle_smart_home_device') {
            return `I've turned ${tc.arguments.state} the ${tc.arguments.device_name}.`;
          }
          return `I've executed ${tc.name.replace(/_/g, ' ')}.`;
        })
        .join(' ');
    }

    return NextResponse.json({
      response:
        finalResponse || "I'm not sure how to respond to that. Could you try rephrasing?",
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      provider: 'groq',
      degraded: false,
    });
  } catch (err) {
    console.error('Groq handler exception:', err);
    return handleMock(messages, true);
  }
}
