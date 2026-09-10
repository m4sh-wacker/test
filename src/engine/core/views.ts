import { asBytes, bytesToLatin1 } from './bytes';

/**
 * Ways of looking at the same bytes.
 *
 * These live in the shell rather than behind the worker on purpose: they are
 * how the output pane *displays* a result, not operations that transform one.
 * Adding "To Hexdump" to the recipe to see a dump edits the recipe, which is a
 * different act from changing how you are looking at what it produced — and it
 * leaves you having to remember to take it out again.
 */

/** The classic offset / hex / ASCII dump, sixteen bytes to the line. */
export function hexdumpOf(value: string): string {
  const bytes = asBytes(value);
  const lines: string[] = [];

  for (let offset = 0; offset < bytes.length; offset += 16) {
    const slice = bytes.subarray(offset, offset + 16);
    const hex = Array.from(slice, (b) => b.toString(16).padStart(2, '0'))
      .join(' ')
      .padEnd(47, ' ');
    // A dot for anything unprintable, which is the convention every other dump
    // uses and the reason the ASCII column is worth having.
    const ascii = Array.from(slice, (b) =>
      b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.',
    ).join('');
    lines.push(`${offset.toString(16).padStart(8, '0')}  ${hex}  |${ascii}|`);
  }

  return lines.join('\n');
}

/** Standard Base64, for pasting a binary result somewhere that wants text. */
export function toBase64(value: string): string {
  return btoa(bytesToLatin1(asBytes(value)));
}
