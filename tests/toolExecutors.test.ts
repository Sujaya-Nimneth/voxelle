import { test, describe } from 'node:test';
import assert from 'node:assert';
import { executeToolCall } from '../src/lib/toolExecutors.ts';
import { parseTimeString, parseDateString, resolveEventStart, buildIcsCalendar } from '../src/lib/toolExecutors.ts';
import type { ToolCall } from '../src/types/types.ts';

function call(name: string, args: Record<string, string>): ToolCall {
  return { id: 't1', name, arguments: args, status: 'executing' };
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

  test('respects custom durationMinutes and timezone TZID in .ics output', () => {
    // 2026-10-24T20:00:00Z = 16:00 in America/New_York (EDT)
    const now = new Date('2026-10-24T20:00:00Z');
    const ics = buildIcsCalendar(
      {
        title: 'Team sync',
        date: 'tomorrow',
        time: '10:00 AM',
        durationMinutes: 30,
        timeZone: 'America/New_York',
      },
      now
    );
    assert.ok(ics.includes('DTSTART;TZID=America/New_York:20261025T100000'));
    assert.ok(ics.includes('DTEND;TZID=America/New_York:20261025T103000'));
  });

  test('timezone-aware past-time rollover uses the client timezone wall clock', () => {
    // 2026-10-24T19:00:00Z = 00:30 on Oct 25 in Asia/Colombo (+05:30)
    const now = new Date('2026-10-24T19:00:00Z');
    const ics = buildIcsCalendar(
      {
        title: 'Colombo Morning',
        date: 'today',
        time: '9:00 AM',
        timeZone: 'Asia/Colombo',
      },
      now
    );
    assert.ok(ics.includes('DTSTART;TZID=Asia/Colombo:20261025T090000'));
  });
});

describe('calculate_expression and get_world_time executors', () => {
  test('evaluates arithmetic expressions safely without eval', () => {
    const res = executeToolCall(
      call('calculate_expression', { expression: '128.40 * 1.18 / 4' })
    );
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.simulated, false);
    assert.ok(res.message.includes('37.878'));

    const parens = executeToolCall(
      call('calculate_expression', { expression: '(2 + 3) * 4 - 5' })
    );
    assert.strictEqual(parens.ok, true);
    assert.ok(parens.message.endsWith('= 15'));
  });

  test('rejects division by zero and unsafe input in calculate_expression', () => {
    const divZero = executeToolCall(call('calculate_expression', { expression: '10 / 0' }));
    assert.strictEqual(divZero.ok, false);

    const injection = executeToolCall(
      call('calculate_expression', { expression: 'process.exit(1)' })
    );
    assert.strictEqual(injection.ok, false);
  });

  test('resolves live world clock times for recognized cities and IANA zones', () => {
    const res = executeToolCall(
      call('get_world_time', { locations: 'Tokyo and London' }),
      { now: new Date('2026-10-24T12:00:00Z') }
    );
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.simulated, false);
    assert.ok(res.message.includes('Tokyo:'));
    assert.ok(res.message.includes('London:'));
  });

  test('returns error outcome for completely unknown world-clock locations', () => {
    const res = executeToolCall(call('get_world_time', { locations: 'Atlantis' }));
    assert.strictEqual(res.ok, false);
  });
});
