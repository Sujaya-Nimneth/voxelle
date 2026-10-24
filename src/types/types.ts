export type AssistantStatus = 'idle' | 'listening' | 'processing' | 'speaking';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  image?: string; // base64 data URI
  isStreaming?: boolean; // true while reply deltas are still arriving
  truncated?: boolean; // reply cut off (stream error/abort) — excluded from API history
}

export interface ToolCallArgs {
  [key: string]: string | number | boolean | undefined;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: ToolCallArgs;
  // Tool calls arrive already executing on the server; 'pending' was never
  // observable by the client, so it doesn't exist in the protocol.
  status: 'executing' | 'completed';
}

export interface ToolEvent {
  id: string;
  toolCall: ToolCall;
  result?: string;
  /** Raw iCalendar payload when the tool produced a downloadable artifact. */
  ics?: string;
  /** True when execution had no real side effect (displayed honestly). */
  simulated?: boolean;
  timestamp: number;
}

export interface SessionEvent {
  id: string;
  title: string;
  subtitle: string;
  timestamp: number;
  status?: 'normal' | 'warn' | 'success';
}

// NDJSON stream events emitted by /api/chat, one JSON object per line.
export type ChatStreamEvent =
  | {
      type: 'meta';
      provider: string;
      /** Model identifier actually serving the request. */
      model?: string;
      degraded?: boolean;
      reason?: string;
      /** Non-fatal advisory, e.g. an image the provider cannot consume. */
      notice?: string;
    }
  | { type: 'delta'; text: string }
  | { type: 'tool'; toolCall: ToolCall }
  | {
      /** Outcome of server-side execution of a previously announced tool call. */
      type: 'tool_result';
      toolCallId: string;
      ok: boolean;
      message: string;
      ics?: string;
      simulated: boolean;
    }
  | { type: 'error'; message: string }
  | { type: 'done'; finishReason?: string };
