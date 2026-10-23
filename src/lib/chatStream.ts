import type { ChatStreamEvent, ToolCall } from '@/types/types';

export type StreamMetaEvent = Extract<ChatStreamEvent, { type: 'meta' }>;

export interface ChatStreamHandlers {
  onMeta?: (meta: StreamMetaEvent) => void;
  onDelta?: (text: string) => void;
  onTool?: (toolCall: ToolCall) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
  /** Fired for every received event — used to reset idle timeouts. */
  onEvent?: () => void;
}

// Pure: extract complete NDJSON lines from an accumulating buffer. Malformed
// lines are skipped; the unconsumed remainder is returned for the next chunk.
export function parseStreamBuffer(buffer: string): {
  events: ChatStreamEvent[];
  rest: string;
} {
  const events: ChatStreamEvent[] = [];
  let rest = buffer;
  let idx: number;
  while ((idx = rest.indexOf('\n')) >= 0) {
    const line = rest.slice(0, idx).trim();
    rest = rest.slice(idx + 1);
    if (!line) continue;
    try {
      events.push(JSON.parse(line) as ChatStreamEvent);
    } catch {
      // skip malformed line
    }
  }
  return { events, rest };
}

// Consumes an NDJSON chat stream from a fetch body, dispatching events until
// `done` arrives or the stream closes.
export async function readChatStream(
  body: ReadableStream<Uint8Array>,
  handlers: ChatStreamHandlers
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const { events, rest } = parseStreamBuffer(buffer);
      buffer = rest;

      for (const event of events) {
        handlers.onEvent?.();
        switch (event.type) {
          case 'meta':
            handlers.onMeta?.(event);
            break;
          case 'delta':
            if (event.text) handlers.onDelta?.(event.text);
            break;
          case 'tool':
            if (event.toolCall && typeof event.toolCall.name === 'string') {
              handlers.onTool?.(event.toolCall);
            }
            break;
          case 'error':
            handlers.onError?.(event.message);
            break;
          case 'done':
            handlers.onDone?.();
            return;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
