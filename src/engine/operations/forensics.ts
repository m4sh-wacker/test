import { OperationError } from '../types';
import { asBytes, printableRatio, shannonEntropy } from '../core/bytes';
import { arg, type Operation } from './types';
import { hexAt, matchSignature } from '../core/signatures';

export const forensicsOperations: Operation[] = [
  {
    id: 'detect-file-type',
    name: 'Detect file type',
    category: 'Forensics',
    description: 'Identifies a file from its magic bytes rather than its name.',
    aliases: ['file type', 'magic bytes', 'what file', 'file signature'],
    args: [],
    run: (input) => {
      const bytes = asBytes(input);
      if (bytes.length < 2) throw new OperationError('Too short to identify.');

      const signature = matchSignature(bytes);
      const prefix = hexAt(bytes, 0, Math.min(16, bytes.length))
        .toUpperCase()
        .replace(/(..)/g, '$1 ')
        .trim();

      if (!signature) {
        return [
          'No known file signature.',
          '',
          `First bytes: ${prefix}`,
          `Entropy:     ${shannonEntropy(bytes).toFixed(2)} bits/byte`,
          `Printable:   ${Math.round(printableRatio(bytes) * 100)}%`,
          '',
          'A high entropy with no signature usually means compressed or encrypted data.',
        ].join('\n');
      }

      return [
        `${signature.description}`,
        '',
        `Extension:   .${signature.extension}`,
        `Signature:   ${signature.magic.toUpperCase().replace(/(..)/g, '$1 ').trim()}`,
        `First bytes: ${prefix}`,
        `Size:        ${bytes.length} bytes`,
        `Entropy:     ${shannonEntropy(bytes).toFixed(2)} bits/byte`,
      ].join('\n');
    },
  },
  {
    id: 'scan-embedded-files',
    name: 'Scan for embedded files',
    category: 'Forensics',
    description: 'Searches the whole input for file signatures, not just the start.',
    aliases: ['carve files', 'embedded', 'find files', 'polyglot'],
    args: [],
    run: (input) => {
      const bytes = asBytes(input);
      const found: string[] = [];

      // Every offset is checked, which is what finds an archive appended to an
      // image or a payload hidden past the end of a document.
      for (let offset = 0; offset < bytes.length; offset++) {
        const signature = matchSignature(bytes, offset);
        if (!signature || signature.offset !== undefined) continue;
        found.push(`0x${offset.toString(16).padStart(8, '0')}  ${signature.description}`);
        if (found.length >= 200) break;
      }

      if (found.length === 0) return '(no file signatures found)';
      return [`${found.length} signature${found.length === 1 ? '' : 's'} found:`, '', ...found].join('\n');
    },
  },
  {
    id: 'entropy',
    name: 'Entropy',
    category: 'Forensics',
    description: 'Measures randomness, which distinguishes text from compressed or encrypted data.',
    aliases: ['shannon entropy', 'randomness'],
    args: [],
    run: (input) => {
      const bytes = asBytes(input);
      if (bytes.length === 0) throw new OperationError('Nothing to measure.');
      const value = shannonEntropy(bytes);

      const reading =
        value < 1
          ? 'Very repetitive — padding, or a long run of one byte.'
          : value < 3.5
            ? 'Structured text: markup, code, or a restricted alphabet.'
            : value < 5
              ? 'Ordinary text or lightly encoded data.'
              : value < 6.5
                ? 'Base64, hex of random data, or lightly compressed content.'
                : value < 7.5
                  ? 'Compressed data, or encrypted with visible structure.'
                  : 'Compressed or encrypted. At this level the bytes carry no visible pattern.';

      return [
        `Entropy:   ${value.toFixed(4)} bits per byte`,
        `Maximum:   8.0000`,
        `Length:    ${bytes.length} bytes`,
        `Printable: ${Math.round(printableRatio(bytes) * 100)}%`,
        '',
        reading,
      ].join('\n');
    },
  },
  {
    id: 'frequency-distribution',
    name: 'Frequency distribution',
    category: 'Forensics',
    description: 'Counts how often each byte occurs, most frequent first.',
    aliases: ['byte frequency', 'histogram', 'character count'],
    args: [{ name: 'Show', type: 'number', value: 20, min: 1, max: 256 }],
    run: (input, args) => {
      const bytes = asBytes(input);
      if (bytes.length === 0) throw new OperationError('Nothing to measure.');

      const counts = new Uint32Array(256);
      for (const byte of bytes) counts[byte]!++;

      const rows = Array.from(counts, (count, byte) => ({ byte, count }))
        .filter((row) => row.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, Number(arg(args, 'Show', 20)));

      const max = rows[0]?.count ?? 1;
      return rows
        .map((row) => {
          const printable =
            row.byte >= 0x20 && row.byte <= 0x7e ? `'${String.fromCharCode(row.byte)}'` : '   ';
          const share = ((row.count / bytes.length) * 100).toFixed(2);
          const bar = '█'.repeat(Math.max(1, Math.round((row.count / max) * 24)));
          return `0x${row.byte.toString(16).padStart(2, '0')} ${printable} ${String(row.count).padStart(7)} ${share.padStart(6)}%  ${bar}`;
        })
        .join('\n');
    },
  },
  {
    id: 'index-of-coincidence',
    name: 'Index of coincidence',
    category: 'Forensics',
    description: 'Measures letter repetition, which separates substitution from polyalphabetic ciphers.',
    aliases: ['ioc', 'coincidence', 'cipher analysis'],
    args: [],
    run: (input) => {
      const letters = input.toUpperCase().replace(/[^A-Z]/g, '');
      if (letters.length < 20) throw new OperationError('Needs at least 20 letters to be meaningful.');

      const counts = new Map<string, number>();
      for (const char of letters) counts.set(char, (counts.get(char) ?? 0) + 1);

      let sum = 0;
      for (const count of counts.values()) sum += count * (count - 1);
      const ioc = sum / (letters.length * (letters.length - 1));

      const reading =
        ioc > 0.06
          ? 'Close to English (0.067). Plaintext, or a simple substitution that preserves letter frequencies.'
          : ioc > 0.045
            ? 'Between the two. Possibly a short polyalphabetic key, or a mixed text.'
            : 'Close to random (0.038). Polyalphabetic, or not a letter-based cipher at all.';

      return [
        `Index of coincidence: ${ioc.toFixed(5)}`,
        `Letters analysed:     ${letters.length}`,
        '',
        'Reference:  English 0.0667   Random 0.0385',
        '',
        reading,
      ].join('\n');
    },
  },
  {
    id: 'chi-square',
    name: 'Chi-square against English',
    category: 'Forensics',
    description: 'Scores how closely letter frequencies match English. Lower is closer.',
    aliases: ['chi squared', 'english score', 'frequency analysis'],
    args: [],
    run: (input) => {
      const expected: Record<string, number> = {
        A: 8.167, B: 1.492, C: 2.782, D: 4.253, E: 12.702, F: 2.228, G: 2.015,
        H: 6.094, I: 6.966, J: 0.153, K: 0.772, L: 4.025, M: 2.406, N: 6.749,
        O: 7.507, P: 1.929, Q: 0.095, R: 5.987, S: 6.327, T: 9.056, U: 2.758,
        V: 0.978, W: 2.360, X: 0.150, Y: 1.974, Z: 0.074,
      };

      const letters = input.toUpperCase().replace(/[^A-Z]/g, '');
      if (letters.length < 20) throw new OperationError('Needs at least 20 letters to be meaningful.');

      const counts = new Map<string, number>();
      for (const char of letters) counts.set(char, (counts.get(char) ?? 0) + 1);

      let chi = 0;
      for (const [letter, percent] of Object.entries(expected)) {
        const e = (percent / 100) * letters.length;
        const o = counts.get(letter) ?? 0;
        chi += ((o - e) ** 2) / e;
      }

      return [
        `Chi-square: ${chi.toFixed(2)}`,
        `Letters:    ${letters.length}`,
        '',
        chi < 100
          ? 'Very close to English letter frequencies.'
          : chi < 500
            ? 'Plausibly English, or a transposition that keeps the letters.'
            : 'Not English letter frequencies. Substitution, encryption, or another language.',
      ].join('\n');
    },
  },
];
