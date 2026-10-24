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
  [key: string]: string | number | boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: ToolCallArgs;
  status: 'pending' | 'executing' | 'completed';
}

export interface ToolEvent {
  id: string;
  toolCall: ToolCall;
  result?: string;
  timestamp: number;
}

export interface SessionEvent {
  id: string;
  title: string;
  subtitle: string;
  timestamp: number;
  status?: 'normal' | 'warn' | 'success';
}

export interface ChatRequest {
  messages: Message[];
  image?: string; // base64
}

// NDJSON stream events emitted by /api/chat, one JSON object per line.
export type ChatStreamEvent =
  | {
      type: 'meta';
      provider: string;
      degraded?: boolean;
      reason?: string;
      /** Non-fatal advisory, e.g. an image the provider cannot consume. */
      notice?: string;
    }
  | { type: 'delta'; text: string }
  | { type: 'tool'; toolCall: ToolCall }
  | { type: 'error'; message: string }
  | { type: 'done'; finishReason?: string };
