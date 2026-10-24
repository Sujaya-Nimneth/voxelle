import { test, describe } from 'node:test';
import assert from 'node:assert';
import { sanitizeMessages } from '../src/app/api/chat/messageSanitizer.ts';
import type { Message } from '../src/types/types.ts';

function raw(partial: Partial<Message> & Pick<Message, 'role'>): Message {
  return { id: 'x', content: 'hi', timestamp: 1, ...partial } as Message;
}

describe('sanitizeMessages', () => {
  test('drops empty-content turns in normal text conversations', () => {
    const result = sanitizeMessages(
      [raw({ role: 'user', content: '' }), raw({ role: 'assistant', content: 'hello' })],
      false
    );
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].role, 'assistant');
  });

  test('keeps an empty-content final user turn when an image is attached (image-only send)', () => {
    const result = sanitizeMessages(
      [raw({ role: 'user', content: 'describe this' }), raw({ role: 'user', content: '' })],
      true
    );
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[1].content, '');
  });

  test('drops an empty-content turn even with image flag when it is not the final user turn', () => {
    const result = sanitizeMessages(
      [raw({ role: 'user', content: '' }), raw({ role: 'assistant', content: 'sure' })],
      true
    );
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].role, 'assistant');
  });

  test('strips roles other than user/assistant', () => {
    const result = sanitizeMessages(
      [
        raw({ role: 'system' as Message['role'], content: 'sys' }),
        raw({ role: 'user', content: 'hi' }),
      ],
      false
    );
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].role, 'user');
  });

  test('caps history at the shared 10-message window (same policy as the client)', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      raw({ role: i % 2 === 0 ? 'user' : 'assistant', content: `m${i}` })
    );
    const result = sanitizeMessages(many, false);
    assert.strictEqual(result.length, 10);
    assert.strictEqual(result[9].content, 'm29');
  });

  test('truncates oversized content', () => {
    const result = sanitizeMessages(
      [raw({ role: 'user', content: 'a'.repeat(9000) })],
      false
    );
    assert.strictEqual(result[0].content.length, 4000);
  });
});
