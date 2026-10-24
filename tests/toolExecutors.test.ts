import { test, describe } from 'node:test';
import assert from 'node:assert';
import { executeToolCall } from '../src/lib/toolExecutors.ts';
import { parseTimeString, parseDateString, resolveEventStart, buildIcsCalendar } from '../src/lib/toolExecutors.ts';
import type { ToolCall } from '../src/types/types.ts';

function call(name: string, args: Record<string, string>): ToolCall {
  return { id: 't1', name, arguments: args, status: 'pending' };
}

describe('executeToolCall', () => {
  test('calendar tool produces a downloadable, importable .ics payload', () => {
    const result = executeToolCall(
      call('add_calendar_event', { title: 'Standup', date: 'tomorrow', time: '9:30 AM' })
    );

    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.simulated, false);
    assert.ok(result.ics?.startsWith('BEGIN:VCALENDAR'));
    assert.ok(result.ics?.includes('SUMMARY:Standup'));
    assert.ok(result.ics?.includes('BEGIN:VEVENT'));
    assert.ok(result.ics?.includes('END:VCALENDAR'));
  });

  test('smart home tool is honestly labeled as simulated', () => {
    const result = executeToolCall(
      call('toggle_smart_home_device', { device_name: 'Desk lamp', state: 'off' })
    );

    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.simulated, true);
    assert.ok(result.message.toLowerCase().includes('simulated'));
    assert.strictEqual(result.ics, undefined);
  });

  test('unknown tool names coming from the model are rejected', () => {
    const result = executeToolCall(call('delete_all_files', { path: '/' }));

    assert.strictEqual(result.ok, false);
    assert.ok(result.message.includes('Rejected'));
  });

  test('calendar tool survives missing args without producing "undefined"', () => {
    const result = executeToolCall(call('add_calendar_event', {}));

    assert.strictEqual(result.ok, true);
    assert.ok(!result.message.includes('undefined'));
    assert.ok(result.ics?.includes('SUMMARY:Untitled event'));
  });
});

describe('ics time and date parsing', () => {
  test('parses 12-hour and 24-hour times', () => {
    assert.deepStrictEqual(parseTimeString('3:00 PM'), { hour: 15, minute: 0 });
    assert.deepStrictEqual(parseTimeString('14:30'), { hour: 14, minute: 30 });
    assert.deepStrictEqual(parseTimeString('9am'), { hour: 9, minute: 0 });
    assert.deepStrictEqual(parseTimeString('12:00 am'), { hour: 0, minute: 0 });
    assert.strictEqual(parseTimeString('banana'), null);
  });

  test('parses relative and absolute dates', () => {
    const now = new Date('2026-10-24T10:00:00');
    const today = parseDateString('today', now);
    const tomorrow = parseDateString('tomorrow', now);
    const iso = parseDateString('2026-12-01', now);

    assert.strictEqual(today?.toDateString(), now.toDateString());
    assert.strictEqual(tomorrow?.getDate(), 25);
    assert.deepStrictEqual(
      [iso?.getFullYear(), iso?.getMonth(), iso?.getDate()],
      [2026, 11, 1]
    );
  });

  test('a past time today rolls to tomorrow instead of the past', () => {
    const now = new Date('2026-10-24T17:00:00');
    const start = resolveEventStart({ title: 'x', date: 'today', time: '3:00 PM' }, now);
    assert.strictEqual(start.getDate(), 25);
    assert.strictEqual(start.getHours(), 15);
  });

  test('output uses RFC 5545 CRLF line endings', () => {
    const ics = buildIcsCalendar({ title: 'T', date: 'today', time: '10:00' });
    assert.ok(ics.includes('\r\n'));
    assert.ok(!/(^|[^\r])\n/.test(ics));
  });

  test('escapes RFC-special characters in the summary', () => {
    const ics = buildIcsCalendar(
      { title: 'Ops, sync; review', date: 'today', time: '10:00' },
      new Date('2026-10-24T10:00:00')
    );
    assert.ok(ics.includes('SUMMARY:Ops\\, sync\\; review'));
  });
});
