import { NextRequest } from 'next/server';
import { getMockResponse, toolDefinitions } from './tools';
import type { Message, ToolCall } from '@/types/types';

// ─── Configuration ───
// Set your preferred provider in .env.local:
//   AI_PROVIDER=gemini     (default — Google AI Studio, free tier)
//   AI_PROVIDER=groq       (Groq, free tier for fast inference)
//   AI_PROVIDER=mock       (demo mode, no API key needed)
//
// API Keys (add to .env.local):
//   GEMINI_API_KEY=your_key_here
//   GROQ_API_KEY=your_key_here

const AI_PROVIDER = process.env.AI_PROVIDER || 'mock';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, image }: { messages: Message[]; image?: string } = body;

    if (!messages || messages.length === 0) {
      return Response.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    // Route to the appropriate provider
    switch (AI_PROVIDER) {
      case 'gemini':
        if (!GEMINI_API_KEY) {
          console.warn('GEMINI_API_KEY not set, falling back to mock mode');
          return handleMock(messages);
        }
        return handleGemini(messages, image);

      case 'groq':
        if (!GROQ_API_KEY) {
          console.warn('GROQ_API_KEY not set, falling back to mock mode');
          return handleMock(messages);
        }
        return handleGroq(messages);

      case 'mock':
      default:
        return handleMock(messages);
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── Mock Handler ───

function handleMock(messages: Message[]) {
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === 'user');

  if (!lastUserMessage) {
    return Response.json({
      response: "Hello! I'm Voxelle, your voice assistant. How can I help you?",
    });
  }

  const result = getMockResponse(lastUserMessage.content);
  return Response.json(result);
}

// ─── Gemini Handler (Google AI Studio — Free Tier) ───

async function handleGemini(messages: Message[], image?: string) {
  // Build conversation history for Gemini
  const geminiMessages = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  // If image is provided, add it to the last user message
  if (image && geminiMessages.length > 0) {
    const lastMsg = geminiMessages[geminiMessages.length - 1];
    if (lastMsg.role === 'user') {
      // Extract base64 data and mime type from data URI
      const match = image.match(/^data:(.+);base64,(.+)$/);
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
          text: `You are Voxelle, a helpful voice-enabled multimodal AI assistant. You can:
1. Have natural conversations
2. Schedule calendar events using the add_calendar_event tool
3. Control smart home devices using the toggle_smart_home_device tool
4. Analyze images when provided

Keep your responses concise and conversational since they will be spoken aloud. Be friendly and helpful.`,
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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Gemini API error:', errorText);
    // Fallback to mock
    return handleMock(messages);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];

  if (!candidate?.content?.parts) {
    return handleMock(messages);
  }

  let responseText = '';
  const toolCalls: ToolCall[] = [];

  for (const part of candidate.content.parts) {
    if (part.text) {
      responseText += part.text;
    }
    if (part.functionCall) {
      toolCalls.push({
        id: `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: part.functionCall.name,
        arguments: part.functionCall.args || {},
        status: 'pending',
      });
    }
  }

  // If there were tool calls but no text response, generate a contextual one
  if (toolCalls.length > 0 && !responseText) {
    responseText = toolCalls
      .map((tc) => {
        if (tc.name === 'add_calendar_event') {
          return `I've scheduled "${tc.arguments.title}" for ${tc.arguments.date} at ${tc.arguments.time}.`;
        }
        if (tc.name === 'toggle_smart_home_device') {
          return `I've turned ${tc.arguments.state} the ${tc.arguments.device_name}.`;
        }
        return `I've executed ${tc.name}.`;
      })
      .join(' ');
  }

  return Response.json({
    response: responseText || "I'm not sure how to respond to that. Could you try rephrasing?",
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  });
}

// ─── Groq Handler (Free Tier — Fast Inference) ───

async function handleGroq(messages: Message[]) {
  const groqMessages = [
    {
      role: 'system',
      content: `You are Voxelle, a helpful voice-enabled multimodal AI assistant. You can:
1. Have natural conversations
2. Schedule calendar events using the add_calendar_event tool
3. Control smart home devices using the toggle_smart_home_device tool

Keep your responses concise and conversational since they will be spoken aloud. Be friendly and helpful.`,
    },
    ...messages.map((m) => ({
      role: m.role as string,
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
      model: 'llama-3.3-70b-versatile',
      messages: groqMessages,
      tools: groqTools,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Groq API error:', errorText);
    return handleMock(messages);
  }

  const data = await res.json();
  const choice = data.choices?.[0];

  if (!choice?.message) {
    return handleMock(messages);
  }

  const responseText = choice.message.content || '';
  const toolCalls: ToolCall[] = (choice.message.tool_calls || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tc: any) => ({
      id: tc.id || `tool_${Date.now()}`,
      name: tc.function.name,
      arguments:
        typeof tc.function.arguments === 'string'
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments,
      status: 'pending' as const,
    })
  );

  // If there were tool calls but no text response, generate contextual text
  let finalResponse = responseText;
  if (toolCalls.length > 0 && !finalResponse) {
    finalResponse = toolCalls
      .map((tc) => {
        if (tc.name === 'add_calendar_event') {
          return `I've scheduled "${tc.arguments.title}" for ${tc.arguments.date} at ${tc.arguments.time}.`;
        }
        if (tc.name === 'toggle_smart_home_device') {
          return `I've turned ${tc.arguments.state} the ${tc.arguments.device_name}.`;
        }
        return `I've executed ${tc.name}.`;
      })
      .join(' ');
  }

  return Response.json({
    response:
      finalResponse ||
      "I'm not sure how to respond to that. Could you try rephrasing?",
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  });
}
