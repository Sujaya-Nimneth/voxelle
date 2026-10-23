import type { Message } from '@/types/types';

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
