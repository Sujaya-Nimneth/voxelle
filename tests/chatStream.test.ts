import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseStreamBuffer } from '../src/lib/chatStream.ts';

describe('parseStreamBuffer', () => {
  test('parses complete NDJSON lines into events', () => {
    const input =
      JSON.stringify({ type: 'meta', provider: 'mock', degraded: false }) +
      '\n' +
      JSON.stringify({ type: 'delta', text: 'Hello ' }) +
      '\n' +
      JSON.stringify({ type: 'delta', text: 'world' }) +
      '\n' +
      JSON.stringify({ type: 'done' }) +
      '\n';

    const { events, rest } = parseStreamBuffer(input);
    assert.strictEqual(events.length, 4);
    assert.strictEqual(events[0].type, 'meta');
    assert.strictEqual(events[1].type, 'delta');
    assert.strictEqual(events[2].type, 'delta');
    assert.strictEqual(events[3].type, 'done');
    assert.strictEqual(rest, '');
  });

  test('keeps a partial trailing line as the remainder for the next chunk', () => {
    const complete = JSON.stringify({ type: 'delta', text: 'hi' }) + '\n';
    const partial = '{"type":"del';

    const { events, rest } = parseStreamBuffer(complete + partial);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(rest, '{"type":"del');

    // Feeding the rest of the line later completes the event
    const next = parseStreamBuffer(rest + 'ta","text":"!"}\n');
    assert.strictEqual(next.events.length, 1);
    assert.strictEqual(next.events[0].type, 'delta');
  });

  test('skips malformed JSON lines without losing the rest of the stream', () => {
    const input = 'not-json\n' + JSON.stringify({ type: 'done' }) + '\n';
    const { events } = parseStreamBuffer(input);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].type, 'done');
  });

  test('ignores blank lines', () => {
    const { events } = parseStreamBuffer('\n\n' + JSON.stringify({ type: 'done' }) + '\n\n');
    assert.strictEqual(events.length, 1);
  });

  test('empty buffer yields no events', () => {
    const { events, rest } = parseStreamBuffer('');
    assert.strictEqual(events.length, 0);
    assert.strictEqual(rest, '');
  });

  test('handles CRLF line endings from proxies', () => {
    const input = JSON.stringify({ type: 'delta', text: 'x' }) + '\r\n';
    const { events } = parseStreamBuffer(input);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].type, 'delta');
  });
});
