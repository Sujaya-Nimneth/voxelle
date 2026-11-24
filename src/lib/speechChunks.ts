// Splits text into utterance-sized chunks for speech synthesis. Chrome's
// remote voices silently truncate long utterances (~15s of speech), and very
// long text can fail outright on mobile engines — sentence-bounded chunks
// under ~200 characters keep playback reliable.

/**
 * Strips Markdown formatting into natural spoken prose while preserving
 * parenthetical phrases such as "(Time-Series Foundation Model)".
 */
export function cleanTextForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' code snippet ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\n+/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const SENTENCE_SEPARATORS = ['. ', '! ', '? ', '.\n', '!\n', '?\n', '\n', '; '];
const DEFAULT_MAX_CHUNK_LENGTH = 200;

export function chunkTextForSpeech(text: string, maxLength = DEFAULT_MAX_CHUNK_LENGTH): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > maxLength) {
    const window = remaining.slice(0, maxLength + 1);
    let cut = 0;
    for (const sep of SENTENCE_SEPARATORS) {
      const idx = window.lastIndexOf(sep);
      if (idx > 0 && idx + sep.length > cut) cut = idx + sep.length;
    }
    if (cut === 0) {
      // No sentence boundary in range — fall back to the last word break
      const spaceIdx = remaining.lastIndexOf(' ', maxLength);
      cut = spaceIdx > 0 ? spaceIdx + 1 : maxLength;
    }
    // A separator landing at the very end of the window can push cut one
    // past the cap; clamp so no chunk exceeds maxLength.
    if (cut > maxLength) cut = maxLength;
    const chunk = remaining.slice(0, cut).trim();
    if (chunk) chunks.push(chunk);
    remaining = remaining.slice(cut).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks.length > 0 ? chunks : [text.trim()];
}
