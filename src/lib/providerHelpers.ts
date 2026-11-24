import type { Message } from '@/types/types';

export type GeminiFunctionCall = { name: string; args?: unknown };

export type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } }
  | { functionCall: GeminiFunctionCall }
  | { functionResponse: { name: string; response: { result: string } } };

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export interface GeminiTurnItem {
  text?: string;
  functionCall?: GeminiFunctionCall;
  finishReason?: string;
}

export interface RawGeminiCandidate {
  finishReason?: string;
  content?: {
    parts?: Array<{
      text?: string;
      thought?: boolean;
      functionCall?: GeminiFunctionCall;
    }>;
  };
}

/**
 * Converts sanitized conversation turns into Gemini `contents`:
 * - drops leading `model` turns (which occur when the 10-message cap slices mid-pair)
 * - merges consecutive turns that share the same role
 * - attaches an optional base64 image to the final `user` turn
 */
export function toGeminiContents(messages: Message[], image?: string): GeminiContent[] {
  const normalized: GeminiContent[] = [];

  for (const m of messages) {
    if (m.role !== 'user' && m.role !== 'assistant') continue;
    const role: 'user' | 'model' = m.role === 'assistant' ? 'model' : 'user';
    const parts: GeminiPart[] = m.content ? [{ text: m.content }] : [];

    // Gemini requires conversations to start with a user turn.
    if (normalized.length === 0 && role === 'model') continue;

    const prev = normalized[normalized.length - 1];
    if (prev && prev.role === role) {
      prev.parts.push(...parts);
    } else {
      normalized.push({ role, parts });
    }
  }

  if (image && normalized.length > 0) {
    const lastMsg = normalized[normalized.length - 1];
    if (lastMsg.role === 'user') {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        lastMsg.parts.push({
          inline_data: {
            mime_type: match[1],
            data: match[2],
          },
        });
      }
    }
  }

  return normalized.filter((turn) => turn.parts.length > 0);
}

/**
 * Extracts all visible text and functionCall parts from a Gemini SSE candidate
 * (instead of only parts[0]), skipping internal thought parts.
 */
export function extractGeminiParts(candidate?: RawGeminiCandidate): GeminiTurnItem[] {
  if (!candidate) return [];
  const items: GeminiTurnItem[] = [];
  const parts = candidate.content?.parts;

  if (Array.isArray(parts)) {
    for (const part of parts) {
      if (!part || part.thought) continue;
      if (typeof part.text === 'string' && part.text.length > 0) {
        items.push({ text: part.text });
      } else if (part.functionCall && typeof part.functionCall.name === 'string') {
        items.push({ functionCall: part.functionCall });
      }
    }
  }

  if (candidate.finishReason) {
    if (items.length > 0) {
      items[items.length - 1].finishReason = candidate.finishReason;
    } else {
      items.push({ finishReason: candidate.finishReason });
    }
  }

  return items;
}

/** Coalesces adjacent text parts before echoing a model turn in tool round-trips. */
export function coalesceGeminiModelParts(parts: GeminiPart[]): GeminiPart[] {
  const merged: GeminiPart[] = [];
  for (const part of parts) {
    const prev = merged[merged.length - 1];
    if ('text' in part && prev && 'text' in prev) {
      prev.text += part.text;
    } else {
      merged.push('text' in part ? { text: part.text } : part);
    }
  }
  return merged;
}

/** Validates an IANA time zone string using Intl.DateTimeFormat. */
export function validateTimeZone(tz: unknown): string | undefined {
  if (typeof tz !== 'string') return undefined;
  const trimmed = tz.trim();
  if (!trimmed || trimmed.length > 100) return undefined;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: trimmed });
    return trimmed;
  } catch {
    return undefined;
  }
}

/** Appends current date, time, and timezone context to provider system instructions. */
export function buildSystemPrompt(
  basePrompt: string,
  timeZone?: string,
  now: Date = new Date()
): string {
  const tz = timeZone || 'UTC';
  try {
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(now);
    return `${basePrompt}\n\nCurrent date/time in user's timezone (${tz}): ${formatted}.`;
  } catch {
    return basePrompt;
  }
}
