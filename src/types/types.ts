export type AssistantStatus = 'idle' | 'listening' | 'processing' | 'speaking';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  image?: string; // base64 data URI
}

export interface ToolCallArgs {
  [key: string]: string;
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

export interface ChatResponse {
  response: string;
  toolCalls?: ToolCall[];
}
