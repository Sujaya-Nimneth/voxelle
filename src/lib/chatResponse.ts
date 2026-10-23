import type { Message, ToolCall, ChatResponse } from '@/types/types';

// Runtime validation for the /api/chat payload. A proxy or gateway returning
// 200 with an HTML error page would otherwise store `undefined` as message
// content and crash the markdown renderer downstream.
export function isValidChatResponse(data: unknown): data is ChatResponse {
  if (typeof data !== 'object' || data === null) return false;
  const candidate = data as Partial<ChatResponse>;
  if (typeof candidate.response !== 'string') return false;
  if (candidate.toolCalls !== undefined && !Array.isArray(candidate.toolCalls)) return false;
  if (Array.isArray(candidate.toolCalls)) {
    for (const tc of candidate.toolCalls) {
      if (typeof tc !== 'object' || tc === null) return false;
      if (typeof (tc as ToolCall).name !== 'string') return false;
    }
  }
  return true;
}

const MAX_HISTORY_FOR_API = 10;

// Builds the outgoing conversation history: system error banners are never
// sent, only the newest turn keeps its image attachment (older base64 blobs
// are stripped to keep payloads small), and the window is capped.
// Pass appendMessage for a fresh send; for a retry the existing history
// already ends with the user turn, so nothing is appended.
export function buildHistoryForApi(
  messages: Message[],
  appendMessage?: Message
): Message[] {
  const base = appendMessage ? [...messages, appendMessage] : [...messages];
  return base
    .slice(-MAX_HISTORY_FOR_API)
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m, idx, arr) => (idx < arr.length - 1 && m.image ? { ...m, image: undefined } : m));
}
