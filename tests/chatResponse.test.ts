import { test, describe } from 'node:test';
import assert from 'node:assert';
import { isValidChatResponse, buildHistoryForApi } from '../src/lib/chatResponse.ts';
import type { Message } from '../src/types/types.ts';

function msg(partial: Partial<Message> & Pick<Message, 'id' | 'role'>): Message {
  return { content: 'hello', timestamp: 0, ...partial } as Message;
}

describe('isValidChatResponse', () => {
  test('accepts a well-formed response', () => {
    assert.ok(isValidChatResponse({ response: 'Hi there', provider: 'mock', degraded: false }));
  });

  test('accepts a response with tool calls', () => {
    assert.ok(
      isValidChatResponse({
        response: 'Done',
        toolCalls: [{ id: 't1', name: 'add_calendar_event', arguments: {}, status: 'pending' }],
      })
    );
  });

  test('rejects non-object payloads (HTML error pages, null, arrays)', () => {
    assert.ok(!isValidChatResponse(null));
    assert.ok(!isValidChatResponse('<html>oops</html>'));
    assert.ok(!isValidChatResponse([1, 2, 3]));
    assert.ok(!isValidChatResponse(undefined));
  });

  test('rejects missing or non-string response field', () => {
    assert.ok(!isValidChatResponse({}));
    assert.ok(!isValidChatResponse({ response: undefined }));
    assert.ok(!isValidChatResponse({ response: 42 }));
  });

  test('rejects malformed toolCalls entries', () => {
    assert.ok(!isValidChatResponse({ response: 'ok', toolCalls: 'nope' }));
    assert.ok(!isValidChatResponse({ response: 'ok', toolCalls: [{ arguments: {} }] }));
  });
});

describe('buildHistoryForApi', () => {
  test('appends the new user message and keeps only its image', () => {
    const history: Message[] = [
      msg({ id: '1', role: 'user', image: 'data:image/png;base64,OLD' }),
      msg({ id: '2', role: 'assistant' }),
    ];
    const appended = msg({ id: '3', role: 'user', image: 'data:image/png;base64,NEW' });

    const result = buildHistoryForApi(history, appended);

    assert.strictEqual(result.length, 3);
    assert.strictEqual(result[0].image, undefined); // old image stripped
    assert.strictEqual(result[2].image, 'data:image/png;base64,NEW'); // newest kept
  });

  test('excludes system error banners from the outgoing history', () => {
    const history: Message[] = [
      msg({ id: '1', role: 'user' }),
      msg({ id: '2', role: 'system', content: 'Error: boom' }),
    ];

    const result = buildHistoryForApi(history, msg({ id: '3', role: 'user' }));

    assert.ok(result.every((m) => m.role !== 'system'));
    assert.strictEqual(result.length, 2);
  });

  test('retry path (no appended message) reuses existing history unchanged', () => {
    const history: Message[] = [
      msg({ id: '1', role: 'user', content: 'please retry me' }),
      msg({ id: '2', role: 'system', content: 'Error: timed out' }),
    ];

    const result = buildHistoryForApi(history);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].content, 'please retry me');
  });

  test('caps the outgoing window at the last 10 messages', () => {
    const history: Message[] = Array.from({ length: 15 }, (_, i) =>
      msg({ id: `m${i}`, role: i % 2 === 0 ? 'user' : 'assistant', content: `m${i}` })
    );

    const result = buildHistoryForApi(history, msg({ id: 'new', role: 'user' }));

    assert.strictEqual(result.length, 10);
    assert.strictEqual(result[result.length - 1].content, 'hello');
  });
});
