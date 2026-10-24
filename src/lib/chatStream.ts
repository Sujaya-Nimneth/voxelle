import type { ChatStreamEvent, ToolCall } from '@/types/types';

export type StreamMetaEvent = Extract<ChatStreamEvent, { type: 'meta' }>;

export interface ChatStreamHandlers {
  onMeta?: (meta: StreamMetaEvent) => void;
  onDelta?: (text: string) => void;
  onTool?: (toolCall: ToolCall) => void;
  onToolResult?: (result: {
    toolCallId: string;
    ok: boolean;
    message: string;
    ics?: string;
    simulated: boolean;
  }) => void;
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

export interface ChatStreamResult {
  /** False when the body closed without a `done` event — the reply is truncated. */
  done: boolean;
  finishReason?: string;
}

// Consumes an NDJSON chat stream from a fetch body, dispatching events until
// `done` arrives or the stream closes. The result says whether `done` actually
// arrived: a body that ends early means the reply was cut off mid-generation.
export async function readChatStream(
  body: ReadableStream<Uint8Array>,
  handlers: ChatStreamHandlers
): Promise<ChatStreamResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: ChatStreamResult = { done: false };

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
          case 'tool_result':
            if (event.toolCallId) {
              handlers.onToolResult?.({
                toolCallId: event.toolCallId,
                ok: event.ok,
                message: event.message,
                ics: event.ics,
                simulated: event.simulated,
              });
            }
            break;
          case 'error':
            // A parseable-but-malformed line may carry no message; never
            // propagate undefined into caller checks.
            handlers.onError?.(event.message || 'The assistant stream reported an error.');
            break;
          case 'done':
            result = { done: true, finishReason: event.finishReason };
            handlers.onDone?.();
            return result;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  return result;
}
