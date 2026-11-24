import type { ToolCall } from '@/types/types';

// ─── Tool execution (server-side) ───
//
// Tool calls are executed HERE — never in the browser — so the model can be
// told what actually happened, and unknown tool names coming out of the model
// can be rejected by an allow-list.

export interface ToolExecutionResult {
  ok: boolean;
  /** Human-readable outcome, shown on the tool card and spoken context. */
  message: string;
  /** Downloadable iCalendar payload when the tool produced one. */
  ics?: string;
  /** True when no real side effect exists (honesty label in the UI). */
  simulated: boolean;
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export interface ExecuteToolOptions {
  now?: Date;
  timeZone?: string;
}

export function executeToolCall(
  call: ToolCall,
  options?: ExecuteToolOptions
): ToolExecutionResult {
  const now = options?.now ?? new Date();
  const timeZone = options?.timeZone;

  switch (call.name) {
    case 'add_calendar_event': {
      const title = str(call.arguments.title, 'Untitled event');
      const date = str(call.arguments.date, 'today');
      const time = str(call.arguments.time, 'next hour');
      const durationMinutes = num(call.arguments.duration_minutes);
      const ics = buildIcsCalendar({ title, date, time, durationMinutes, timeZone }, now);
      return {
        ok: true,
        message: `Event "${title}" ready (${date} at ${time}) — download to add it to your calendar.`,
        ics,
        simulated: false,
      };
    }
    case 'toggle_smart_home_device': {
      const device = str(call.arguments.device_name, 'device');
      const state = str(call.arguments.state, 'on');
      const setting = str(call.arguments.setting, '');
      const detail = setting ? ` (${setting})` : '';
      // No hardware integration exists; the result says so plainly.
      return {
        ok: true,
        message: `Simulated: ${device} turned ${state}${detail}. No device hub is connected.`,
        simulated: true,
      };
    }
    case 'calculate_expression': {
      const expression = str(call.arguments.expression, '');
      const value = evaluateMathExpression(expression);
      if (value === null) {
        return {
          ok: false,
          message: `Could not evaluate arithmetic expression "${expression || '(empty)'}".`,
          simulated: false,
        };
      }
      const formatted = formatCalculatedNumber(value);
      return {
        ok: true,
        message: `${expression} = ${formatted}`,
        simulated: false,
      };
    }
    case 'get_world_time': {
      const locations = str(call.arguments.locations, '');
      const { entries, unknown } = resolveWorldTimes(locations, now);
      if (entries.length === 0) {
        return {
          ok: false,
          message: `Could not resolve a recognized city or time zone from "${locations || '(empty)'}".`,
          simulated: false,
        };
      }
      const summary = entries.map((e) => `${e.label}: ${e.formatted}`).join(' · ');
      const suffix = unknown.length > 0 ? ` (Unrecognized: ${unknown.join(', ')})` : '';
      return {
        ok: true,
        message: `${summary}${suffix}`,
        simulated: false,
      };
    }
    default:
      // The model proposed a tool outside the declared allow-list.
      return {
        ok: false,
        message: `Rejected unknown tool "${call.name}".`,
        simulated: false,
      };
  }
}

// ─── Safe Recursive-Descent Arithmetic Evaluator (no eval) ───

type MathToken =
  | { type: 'num'; value: number }
  | { type: 'op'; value: '+' | '-' | '*' | '/' | '%' }
  | { type: 'paren'; value: '(' | ')' };

function tokenizeMath(input: string): MathToken[] | null {
  const cleaned = input.replace(/[,$]/g, '').trim();
  if (!cleaned || cleaned.length > 200) return null;

  const tokens: MathToken[] = [];
  let i = 0;

  while (i < cleaned.length) {
    const ch = cleaned[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      let seenDot = false;
      while (i < cleaned.length && /[0-9.]/.test(cleaned[i])) {
        if (cleaned[i] === '.') {
          if (seenDot) return null;
          seenDot = true;
        }
        numStr += cleaned[i];
        i++;
      }
      if (numStr === '.') return null;
      const val = Number(numStr);
      if (!Number.isFinite(val)) return null;
      tokens.push({ type: 'num', value: val });
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '%') {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i++;
      continue;
    }
    return null;
  }

  return tokens;
}

export function evaluateMathExpression(expr: string): number | null {
  const tokens = tokenizeMath(expr);
  if (!tokens || tokens.length === 0) return null;

  let pos = 0;

  const parseExpression = (): number | null => {
    let left = parseTerm();
    if (left === null) return null;

    while (pos < tokens.length) {
      const tok = tokens[pos];
      if (tok.type === 'op' && (tok.value === '+' || tok.value === '-')) {
        pos++;
        const right = parseTerm();
        if (right === null) return null;
        left = tok.value === '+' ? left + right : left - right;
      } else {
        break;
      }
    }
    return Number.isFinite(left) ? left : null;
  };

  const parseTerm = (): number | null => {
    let left = parseFactor();
    if (left === null) return null;

    while (pos < tokens.length) {
      const tok = tokens[pos];
      if (tok.type === 'op' && (tok.value === '*' || tok.value === '/' || tok.value === '%')) {
        pos++;
        const right = parseFactor();
        if (right === null) return null;
        if (tok.value === '*') {
          left = left * right;
        } else {
          if (right === 0) return null;
          left = tok.value === '/' ? left / right : left % right;
        }
      } else {
        break;
      }
    }
    return Number.isFinite(left) ? left : null;
  };

  const parseFactor = (): number | null => {
    if (pos >= tokens.length) return null;
    const tok = tokens[pos];
    if (tok.type === 'op' && (tok.value === '+' || tok.value === '-')) {
      pos++;
      const inner = parseFactor();
      if (inner === null) return null;
      return tok.value === '-' ? -inner : inner;
    }
    if (tok.type === 'paren' && tok.value === '(') {
      pos++;
      const inner = parseExpression();
      if (inner === null) return null;
      const close = tokens[pos];
      if (!close || close.type !== 'paren' || close.value !== ')') return null;
      pos++;
      return inner;
    }
    if (tok.type === 'num') {
      pos++;
      return tok.value;
    }
    return null;
  };

  const result = parseExpression();
  if (result === null || pos !== tokens.length || !Number.isFinite(result)) return null;
  return result;
}

export function formatCalculatedNumber(value: number): string {
  const normalized = Number(value.toFixed(10));
  return Number.isInteger(normalized)
    ? String(normalized)
    : normalized.toString();
}

// ─── World Clock Lookup ───

const CITY_TIMEZONES: Record<string, { label: string; timeZone: string }> = {
  tokyo: { label: 'Tokyo', timeZone: 'Asia/Tokyo' },
  london: { label: 'London', timeZone: 'Europe/London' },
  'new york': { label: 'New York', timeZone: 'America/New_York' },
  nyc: { label: 'New York', timeZone: 'America/New_York' },
  'los angeles': { label: 'Los Angeles', timeZone: 'America/Los_Angeles' },
  'san francisco': { label: 'San Francisco', timeZone: 'America/Los_Angeles' },
  chicago: { label: 'Chicago', timeZone: 'America/Chicago' },
  paris: { label: 'Paris', timeZone: 'Europe/Paris' },
  berlin: { label: 'Berlin', timeZone: 'Europe/Berlin' },
  sydney: { label: 'Sydney', timeZone: 'Australia/Sydney' },
  singapore: { label: 'Singapore', timeZone: 'Asia/Singapore' },
  dubai: { label: 'Dubai', timeZone: 'Asia/Dubai' },
  mumbai: { label: 'Mumbai', timeZone: 'Asia/Kolkata' },
  delhi: { label: 'Delhi', timeZone: 'Asia/Kolkata' },
  colombo: { label: 'Colombo', timeZone: 'Asia/Colombo' },
  seoul: { label: 'Seoul', timeZone: 'Asia/Seoul' },
  toronto: { label: 'Toronto', timeZone: 'America/Toronto' },
  utc: { label: 'UTC', timeZone: 'UTC' },
  gmt: { label: 'GMT', timeZone: 'UTC' },
};

export interface WorldTimeEntry {
  label: string;
  timeZone: string;
  formatted: string;
}

export function resolveWorldTimes(
  locations: string,
  now: Date = new Date()
): { entries: WorldTimeEntry[]; unknown: string[] } {
  const parts = locations
    .split(/,|\band\b/i)
    .map((p) => p.replace(/^(?:in|the)\s+/i, '').replace(/[?.,!]+$/, '').trim())
    .filter(Boolean);

  const entries: WorldTimeEntry[] = [];
  const unknown: string[] = [];
  const seenZones = new Set<string>();

  for (const part of parts) {
    const key = part.toLowerCase();
    const mapped = CITY_TIMEZONES[key];
    let label = mapped?.label ?? part;
    let timeZone = mapped?.timeZone;

    if (!timeZone) {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: part });
        timeZone = part;
        label = part.split('/').pop()?.replace(/_/g, ' ') || part;
      } catch {
        unknown.push(part);
        continue;
      }
    }

    const dedupeKey = `${label}:${timeZone}`;
    if (seenZones.has(dedupeKey)) continue;
    seenZones.add(dedupeKey);

    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    }).format(now);

    entries.push({ label, timeZone, formatted });
  }

  return { entries, unknown };
}

// ─── RFC 5545 iCalendar generation ───
//
// Produces a real, importable .ics file the user can download — no calendar
// API needed. This section is pure and self-contained so it stays testable.

export interface CalendarEventInput {
  title: string;
  date: string;
  time: string;
  durationMinutes?: number;
  timeZone?: string;
}

const DEFAULT_DURATION_MINUTES = 60;

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function toIcsLocalTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function toIcsWallTimeFromUtcMs(utcMs: number): string {
  const d = new Date(utcMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
  );
}

function toIcsUtcTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function getWallClockInTimeZone(date: Date, timeZone: string): Date | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);

    const get = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((p) => p.type === type)?.value ?? NaN);

    const year = get('year');
    const month = get('month');
    const day = get('day');
    const hour = get('hour');
    const minute = get('minute');
    const second = get('second');
    if ([year, month, day, hour, minute, second].some(Number.isNaN)) return null;
    return new Date(year, month - 1, day, hour, minute, second);
  } catch {
    return null;
  }
}

// "3:00 PM", "14:30", "2pm", "9 a.m." → {hour, minute}; null when unparseable.
export function parseTimeString(
  value: string
): { hour: number; minute: number } | null {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?$/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3]?.toLowerCase().startsWith('p')
    ? 'pm'
    : match[3]?.toLowerCase().startsWith('a')
      ? 'am'
      : undefined;

  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

// "today", "tomorrow", "this afternoon", "2026-09-18", "sep 18" style strings
// → explicit date; null when unparseable.
export function parseDateString(value: string, now: Date): Date | null {
  const v = value.trim().toLowerCase();

  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const d = new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10));
    return isNaN(d.getTime()) ? null : d;
  }

  if (v.includes('tomorrow')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d;
  }
  // "today", "this afternoon", "tonight", "this evening"…
  if (
    v.includes('today') ||
    v.includes('tonight') ||
    v.includes('afternoon') ||
    v.includes('evening') ||
    v.includes('morning')
  ) {
    return new Date(now);
  }

  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthDay = v.match(/^([a-z]{3})\w*\s+(\d{1,2})$/);
  if (monthDay) {
    const month = monthNames.indexOf(monthDay[1]);
    const day = parseInt(monthDay[2], 10);
    if (month !== -1 && day >= 1 && day <= 31) {
      let year = now.getFullYear();
      const d = new Date(year, month, day);
      if (d < now) d.setFullYear(++year);
      return d;
    }
  }

  return null;
}

// Resolves the event's start moment from loosely-structured model arguments.
// Falls back to "next round hour today" rather than failing — a usable event
// beats a rejected one, and the description carries the original wording.
export function resolveEventStart(
  input: CalendarEventInput,
  now: Date = new Date()
): Date {
  const day = parseDateString(input.date, now) ?? new Date(now);
  const parsedTime = parseTimeString(input.time);

  const start = new Date(day);
  if (parsedTime) {
    start.setHours(parsedTime.hour, parsedTime.minute, 0, 0);
  } else {
    // Next round hour
    start.setHours(start.getHours() + 1, 0, 0, 0);
  }

  // A time already past today (e.g. "3 PM" asked at 5 PM) rolls to tomorrow.
  if (start.getTime() < now.getTime() - 60_000) {
    start.setDate(start.getDate() + 1);
  }
  return start;
}

export function buildIcsCalendar(
  input: CalendarEventInput,
  now: Date = new Date()
): string {
  const clampedDuration =
    typeof input.durationMinutes === 'number' && Number.isFinite(input.durationMinutes)
      ? Math.max(5, Math.min(720, Math.round(input.durationMinutes)))
      : DEFAULT_DURATION_MINUTES;

  const wallNow = input.timeZone ? getWallClockInTimeZone(now, input.timeZone) : null;
  const effectiveNow = wallNow ?? now;
  const start = resolveEventStart(input, effectiveNow);

  const startUtcWallMs = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
    start.getHours(),
    start.getMinutes(),
    start.getSeconds()
  );
  const endUtcWallMs = startUtcWallMs + clampedDuration * 60_000;

  const startStamp = wallNow && input.timeZone
    ? `DTSTART;TZID=${input.timeZone}:${toIcsLocalTime(start)}`
    : `DTSTART:${toIcsLocalTime(start)}`;
  const endStamp = wallNow && input.timeZone
    ? `DTEND;TZID=${input.timeZone}:${toIcsWallTimeFromUtcMs(endUtcWallMs)}`
    : `DTEND:${toIcsWallTimeFromUtcMs(endUtcWallMs)}`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Voxelle//Voice Assistant//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${start.getTime()}-${Math.random().toString(36).slice(2, 10)}@voxelle`,
    `DTSTAMP:${toIcsUtcTime(now)}`,
    startStamp,
    endStamp,
    `SUMMARY:${escapeIcsText(input.title || 'Untitled event')}`,
    `DESCRIPTION:${escapeIcsText(`Scheduled by Voxelle (${input.date} ${input.time})`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  // RFC 5545 requires CRLF line endings.
  return lines.join('\r\n') + '\r\n';
}
