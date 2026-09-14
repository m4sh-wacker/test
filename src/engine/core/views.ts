import { asBytes, bytesToLatin1 } from './bytes';


export function hexdumpOf(value: string): string {
  const bytes = asBytes(value);
  const lines: string[] = [];

  for (let offset = 0; offset < bytes.length; offset += 16) {
    const slice = bytes.subarray(offset, offset + 16);
    const hex = Array.from(slice, (b) => b.toString(16).padStart(2, '0'))
      .join(' ')
      .padEnd(47, ' ');
    const ascii = Array.from(slice, (b) =>
      b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.',
    ).join('');
    lines.push(`${offset.toString(16).padStart(8, '0')}  ${hex}  |${ascii}|`);
  }

  return lines.join('\n');
}

export function toBase64(value: string): string {
  return btoa(bytesToLatin1(asBytes(value)));
}
