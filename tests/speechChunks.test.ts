import { test, describe } from 'node:test';
import assert from 'node:assert';
import { chunkTextForSpeech } from '../src/lib/speechChunks.ts';

describe('chunkTextForSpeech', () => {
  test('short text passes through as a single chunk', () => {
    assert.deepStrictEqual(chunkTextForSpeech('Hello there.'), ['Hello there.']);
  });

  test('empty text still yields a speakable single chunk', () => {
    assert.deepStrictEqual(chunkTextForSpeech('   '), ['']);
  });

  test('long text splits at sentence boundaries', () => {
    const sentence = 'This is a complete spoken sentence that stands on its own. ';
    const text = sentence.repeat(6).trim(); // ~348 chars
    const chunks = chunkTextForSpeech(text);

    assert.ok(chunks.length > 1);
    for (const chunk of chunks) {
      assert.ok(chunk.length <= 200, `chunk too long: ${chunk.length}`);
      assert.ok(chunk.endsWith('.'), `chunk should end at a sentence boundary: "${chunk.slice(-20)}"`);
    }
    // No content lost
    assert.strictEqual(chunks.join(' ').replace(/\s+/g, ' '), text.replace(/\s+/g, ' '));
  });

  test('text without sentence boundaries falls back to word boundaries', () => {
    const text = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' '); // ~480 chars, no periods
    const chunks = chunkTextForSpeech(text);

    assert.ok(chunks.length > 1);
    for (const chunk of chunks) {
      assert.ok(chunk.length <= 200);
      assert.ok(!chunk.startsWith(' '), 'chunks should be trimmed');
    }
  });

  test('unbreakable single word longer than the limit is hard-split', () => {
    const text = 'a'.repeat(500);
    const chunks = chunkTextForSpeech(text);
    assert.strictEqual(chunks.length, 3);
    assert.strictEqual(chunks.join(''), text);
  });

  test('a separator landing at the very end of the window never exceeds the cap', () => {
    // 199 chars, a period, then a space at index 200 — the old window logic
    // produced a 201-char chunk here.
    const text = 'a'.repeat(199) + '. ' + 'b'.repeat(50);
    const chunks = chunkTextForSpeech(text);
    for (const chunk of chunks) {
      assert.ok(chunk.length <= 200, `chunk too long: ${chunk.length}`);
    }
  });
});
