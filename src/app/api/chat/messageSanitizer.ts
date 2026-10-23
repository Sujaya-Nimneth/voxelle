import type { Message } from '@/types/types';

const MAX_MESSAGES_COUNT = 20;
const MAX_MESSAGE_CONTENT_LENGTH = 4000;

// Normalizes client-supplied conversation history: only user/assistant turns,
// capped at the last 20, content truncated. Empty-content turns are dropped —
// except the newest user turn when an image accompanies the request, which is
// a valid image-only send that must survive so the provider sees the turn.
export function sanitizeMessages(messages: Message[], hasImage: boolean): Message[] {
  return messages
    .slice(-MAX_MESSAGES_COUNT)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => ({
      id: typeof m.id === 'string' ? m.id : `msg_${Date.now()}`,
      role: m.role as 'user' | 'assistant',
      content:
        typeof m.content === 'string' ? m.content.slice(0, MAX_MESSAGE_CONTENT_LENGTH) : '',
      timestamp: typeof m.timestamp === 'number' ? m.timestamp : Date.now(),
    }))
    .filter(
      (m, idx, arr) =>
        m.content.trim().length > 0 ||
        (hasImage && idx === arr.length - 1 && m.role === 'user')
    );
}
