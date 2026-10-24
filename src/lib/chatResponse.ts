import type { Message } from '@/types/types';

// Shared history policy: the client builds the outgoing window with this
// cap and the server's sanitizer re-applies the same cap defensively.
export const MAX_HISTORY_FOR_API = 10;

// Builds the outgoing conversation history. Images never belong here: the
// server reads only the top-level `image` field of the request (embedded
// base64 blobs are silently discarded by its sanitizer), so keeping one on
// the newest message would double the payload for no effect. System banners
// and truncated (interrupted) replies are dropped — a half-finished assistant
// turn as the last history entry makes the model "continue" the fragment
// instead of answering, and breaks retry. The window is capped.
// Pass appendMessage for a fresh send; for a retry the existing history
// already ends with the user turn, so nothing is appended.
export function buildHistoryForApi(
  messages: Message[],
  appendMessage?: Message
): Message[] {
  const base = appendMessage ? [...messages, appendMessage] : [...messages];
  return base
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && !m.truncated)
    .slice(-MAX_HISTORY_FOR_API)
    .map((m) => ({ ...m, image: undefined }));
}
