import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  coalesceGeminiModelParts,
  extractGeminiParts,
  toGeminiContents,
  validateTimeZone,
} from '../src/lib/providerHelpers.ts';
import type { Message } from '../src/types/types.ts';

function msg(role: Message['role'], content: string, id = 'id'): Message {
  return { id, role, content, timestamp: 1 };
}

describe('providerHelpers', () => {
  test('toGeminiContents drops leading model turns so 10-message windows always start with user', () => {
    const history: Message[] = [
      msg('assistant', 'sliced reply first', '1'),
      msg('user', 'follow-up question', '2'),
      msg('assistant', 'second reply', '3'),
      msg('user', 'latest question', '4'),
    ];
    const contents = toGeminiContents(history);
    assert.strictEqual(contents[0].role, 'user');
    assert.strictEqual(contents.length, 3);
    assert.deepStrictEqual(contents[0].parts, [{ text: 'follow-up question' }]);
  });

  test('toGeminiContents merges consecutive same-role turns and attaches image to final user turn', () => {
    const history: Message[] = [
      msg('user', 'first part', '1'),
      msg('user', 'second part', '2'),
    ];
    const contents = toGeminiContents(history, 'data:image/png;base64,AAA=');
    assert.strictEqual(contents.length, 1);
    assert.strictEqual(contents[0].parts.length, 3);
    assert.deepStrictEqual(contents[0].parts[2], {
      inline_data: { mime_type: 'image/png', data: 'AAA=' },
    });
  });

  test('extractGeminiParts yields all non-thought text and functionCall parts in a candidate', () => {
    const items = extractGeminiParts({
      finishReason: 'STOP',
      content: {
        parts: [
          { thought: true, text: 'internal reasoning' },
          { text: 'Checking your calendar now. ' },
          { functionCall: { name: 'add_calendar_event', args: { title: 'Sync' } } },
        ],
      },
    });
    assert.strictEqual(items.length, 2);
    assert.strictEqual(items[0].text, 'Checking your calendar now. ');
    assert.strictEqual(items[1].functionCall?.name, 'add_calendar_event');
    assert.strictEqual(items[1].finishReason, 'STOP');
  });

  test('coalesceGeminiModelParts merges adjacent text chunks cleanly', () => {
    const merged = coalesceGeminiModelParts([
      { text: 'Hello ' },
      { text: 'world' },
      { functionCall: { name: 'get_world_time', args: { locations: 'Tokyo' } } },
    ]);
    assert.strictEqual(merged.length, 2);
    assert.deepStrictEqual(merged[0], { text: 'Hello world' });
  });

  test('validateTimeZone accepts valid IANA zones and rejects invalid ones', () => {
    assert.strictEqual(validateTimeZone('America/New_York'), 'America/New_York');
    assert.strictEqual(validateTimeZone('Invalid/Zone_99'), undefined);
    assert.strictEqual(validateTimeZone(123), undefined);
  });
});
