import { test, describe } from 'node:test';
import assert from 'node:assert';
import { buildHistoryForApi } from '../src/lib/chatResponse.ts';
import type { Message } from '../src/types/types.ts';

function msg(partial: Partial<Message> & Pick<Message, 'id' | 'role'>): Message {
  return { content: 'hello', timestamp: 0, ...partial } as Message;
}

describe('buildHistoryForApi', () => {
  test('strips every embedded image — the request-level image field is the only channel', () => {
    const history: Message[] = [
      msg({ id: '1', role: 'user', image: 'data:image/png;base64,OLD' }),
      msg({ id: '2', role: 'assistant' }),
    ];
    const appended = msg({ id: '3', role: 'user', image: 'data:image/png;base64,NEW' });

    const result = buildHistoryForApi(history, appended);

    assert.strictEqual(result.length, 3);
    // Embedded base64 blobs are dead weight server-side; none should ship.
    assert.ok(result.every((m) => m.image === undefined));
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

  test('truncated partial replies never enter the outgoing history', () => {
    const history: Message[] = [
      msg({ id: '1', role: 'user', content: 'tell me a story' }),
      msg({ id: '2', role: 'assistant', content: 'Once upon a', truncated: true }),
    ];

    const result = buildHistoryForApi(history, msg({ id: '3', role: 'user', content: 'again' }));

    assert.strictEqual(result.length, 2);
    assert.ok(result.every((m) => m.id !== '2'));
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
