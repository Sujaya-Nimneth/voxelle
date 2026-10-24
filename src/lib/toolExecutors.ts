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

export function executeToolCall(call: ToolCall): ToolExecutionResult {
  switch (call.name) {
    case 'add_calendar_event': {
      const title = str(call.arguments.title, 'Untitled event');
      const date = str(call.arguments.date, 'today');
      const time = str(call.arguments.time, 'next hour');
      const ics = buildIcsCalendar({ title, date, time });
      return {
        ok: true,
        message: `Event "${title}" ready — download to add it to your calendar.`,
        ics,
        simulated: false,
      };
    }
    case 'toggle_smart_home_device': {
      const device = str(call.arguments.device_name, 'device');
      const state = str(call.arguments.state, 'on');
      // No hardware integration exists; the result says so plainly.
      return {
        ok: true,
        message: `Simulated: ${device} turned ${state}. No device hub is connected.`,
        simulated: true,
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

// ─── RFC 5545 iCalendar generation ───
//
// Produces a real, importable .ics file the user can download — no calendar
// API needed. This section is pure and self-contained so it stays testable.

export interface CalendarEventInput {
  title: string;
  date: string;
  time: string;
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

function toIcsUtcTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
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
  const start = resolveEventStart(input, now);
  const end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60_000);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Voxelle//Voice Assistant//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${start.getTime()}-${Math.random().toString(36).slice(2, 10)}@voxelle`,
    `DTSTAMP:${toIcsUtcTime(now)}`,
    `DTSTART:${toIcsLocalTime(start)}`,
    `DTEND:${toIcsLocalTime(end)}`,
    `SUMMARY:${escapeIcsText(input.title || 'Untitled event')}`,
    `DESCRIPTION:${escapeIcsText(`Scheduled by Voxelle (${input.date} ${input.time})`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  // RFC 5545 requires CRLF line endings.
  return lines.join('\r\n') + '\r\n';
}
