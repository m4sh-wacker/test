import { OperationError } from '../types';
import { asBytes, bytesToLatin1 } from '../core/bytes';
import { decodeBaseN, encodeBaseN } from '../core/alphabet';
import { BASE32_ALPHABETS, BASE64_ALPHABETS, optionsFor } from '../core/alphabets64';
import { arg, type Operation } from './types';

/*
 * How the bytes are separated. '0x' and '\\x' are prefixes rather than
 * separators — `0xde 0xad` — which is how hex arrives from a debugger or a
 * disassembler, and pasting that back in is the common case.
 */
const HEX_DELIMITERS: Record<string, string> = {
  Space: ' ',
  None: '',
  Comma: ',',
  'Semi-colon': ';',
  Colon: ':',
  'Line feed': '\n',
  '0x': ' ',
  '\\x': '',
};

const B64_STANDARD = BASE64_ALPHABETS[0]!.spec;
const B32_STANDARD = BASE32_ALPHABETS[0]!.spec;

/** The two settings every base-N decode carries, spelled the same way. */
function decodeSettings(args: Parameters<typeof arg>[0]) {
  return {
    removeNonAlphabet: arg(args, 'Remove non-alphabet chars', true),
    strict: arg(args, 'Strict mode', false),
  };
}

const B58_ALPHABET ='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function encodeBase58(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';
  const digits: number[] = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i]! << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let out = '';
  for (const byte of bytes) {
    if (byte !== 0) break;
    out += B58_ALPHABET[0];
  }
  for (let i = digits.length - 1; i >= 0; i--) out += B58_ALPHABET[digits[i]!];
  return out;
}

function decodeBase58(text: string): Uint8Array {
  const cleaned = text.trim();
  const bytes: number[] = [0];
  for (const char of cleaned) {
    const index = B58_ALPHABET.indexOf(char);
    if (index === -1) throw new OperationError(`'${char}' is not a Base58 character.`);
    let carry = index;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i]! * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (const char of cleaned) {
    if (char !== B58_ALPHABET[0]) break;
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}

/**
 * UTF-16LE ASCII text is half null bytes, one after every character. That is
 * the signature of Windows tooling — `powershell -EncodedCommand` above all —
 * and it looks like binary noise to anything that does not check for it.
 */
export function utf16leRatio(bytes: Uint8Array): number {
  if (bytes.length < 4) return 0;
  let pairs = 0;
  const limit = bytes.length - (bytes.length % 2);
  for (let i = 0; i < limit; i += 2) {
    if (bytes[i + 1] === 0 && bytes[i]! >= 0x09 && bytes[i]! <= 0x7e) pairs++;
  }
  return pairs / (limit / 2);
}

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const dataFormatOperations: Operation[] = [
  {
    id: 'from-base64',
    name: 'From Base64',
    category: 'Data format',
    description: 'Decodes Base64-encoded data back to its original form.',
    aliases: ['b64', 'base64 decode', 'atob', 'unbase64'],
    args: [
      { name: 'Alphabet', type: 'option', value: B64_STANDARD, ...optionsFor(BASE64_ALPHABETS) },
      { name: 'Remove non-alphabet chars', type: 'boolean', value: true },
      { name: 'Strict mode', type: 'boolean', value: false },
    ],
    run: (input, args) =>
      bytesToLatin1(
        decodeBaseN(input, arg(args, 'Alphabet', B64_STANDARD), 64, decodeSettings(args)),
      ),
    detection: {
      /*
       * The length is `minLength`'s job, and it used to be done here as well —
       * `{8,}` before the padding — which is the same rule applied twice with
       * two different meanings. `minLength` counts the whole string; the
       * pattern counted only the part before `=`. So `Ylcxaw==` is eight
       * characters by one rule and six by the other, and it was rejected.
       *
       * That is not a corner case, it is the main case. Nesting shrinks every
       * layer: this one turned up four deep in a real payload, where three
       * Base64 layers unwrapped and the fourth was declared plain text. The
       * padding is a *signal* that it is Base64, and it was being counted as a
       * reason to think it was not.
       */
      pattern: /^[A-Za-z0-9+/\-_\s]+={0,2}$/,
      entropy: [2.0, 6.2],
      minLength: 8,
    },
  },
  {
    id: 'to-base64',
    name: 'To Base64',
    category: 'Data format',
    description: 'Encodes data as Base64.',
    aliases: ['base64 encode', 'btoa'],
    args: [
      { name: 'Alphabet', type: 'option', value: B64_STANDARD, ...optionsFor(BASE64_ALPHABETS) },
    ],
    run: (input, args) => encodeBaseN(asBytes(input), arg(args, 'Alphabet', B64_STANDARD), 64),
  },
  {
    id: 'from-base32',
    name: 'From Base32',
    category: 'Data format',
    description: 'Decodes Base32-encoded data (RFC 4648).',
    aliases: ['base32 decode', 'b32'],
    args: [
      { name: 'Alphabet', type: 'option', value: B32_STANDARD, ...optionsFor(BASE32_ALPHABETS) },
      { name: 'Remove non-alphabet chars', type: 'boolean', value: true },
      { name: 'Strict mode', type: 'boolean', value: false },
    ],
    run: (input, args) =>
      bytesToLatin1(
        decodeBaseN(input, arg(args, 'Alphabet', B32_STANDARD), 32, decodeSettings(args)),
      ),
    detection: {
      pattern: /^[A-Z2-7\s]{8,}={0,6}$/,
      entropy: [2.0, 5.2],
      minLength: 8,
    },
  },
  {
    id: 'to-base32',
    name: 'To Base32',
    category: 'Data format',
    description: 'Encodes data as Base32 (RFC 4648).',
    aliases: ['base32 encode'],
    args: [
      { name: 'Alphabet', type: 'option', value: B32_STANDARD, ...optionsFor(BASE32_ALPHABETS) },
    ],
    run: (input, args) => encodeBaseN(asBytes(input), arg(args, 'Alphabet', B32_STANDARD), 32),
  },
  {
    id: 'from-base58',
    name: 'From Base58',
    category: 'Data format',
    description: 'Decodes Base58, the alphabet used by Bitcoin and IPFS.',
    aliases: ['base58 decode', 'b58'],
    args: [],
    run: (input) => bytesToLatin1(decodeBase58(input)),
    detection: {
      pattern: /^[1-9A-HJ-NP-Za-km-z]{16,}$/,
      entropy: [3.0, 6.0],
      minLength: 16,
    },
  },
  {
    id: 'to-base58',
    name: 'To Base58',
    category: 'Data format',
    description: 'Encodes data as Base58.',
    aliases: ['base58 encode'],
    args: [],
    run: (input) => encodeBase58(asBytes(input)),
  },
  {
    id: 'from-hex',
    name: 'From Hex',
    category: 'Data format',
    description: 'Converts a hexadecimal string back to raw data.',
    aliases: ['hex decode', 'unhex', 'hex2str'],
    args: [
      {
        name: 'Delimiter',
        type: 'option',
        value: 'Auto',
        options: ['Auto', 'None', 'Space', 'Comma', '0x'],
      },
    ],
    run: (input) => {
      const cleaned = input.replace(/0x/gi, '').replace(/[\s,:;-]/g, '');
      if (cleaned.length === 0) throw new OperationError('No hex digits found.');
      if (cleaned.length % 2 !== 0) {
        throw new OperationError('Hex input has an odd number of digits.');
      }
      if (!/^[0-9a-fA-F]+$/.test(cleaned)) {
        throw new OperationError('Input contains characters that are not hex digits.');
      }
      const bytes = new Uint8Array(cleaned.length / 2);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(cleaned.substr(i * 2, 2), 16);
      }
      return bytesToLatin1(bytes);
    },
    detection: {
      pattern: /^(0x)?[0-9a-fA-F\s,:-]{8,}$/,
      lengthMultiple: 2,
      minLength: 8,
    },
  },
  {
    id: 'to-hex',
    name: 'To Hex',
    category: 'Data format',
    description: 'Converts data to its hexadecimal representation.',
    aliases: ['hex encode', 'str2hex'],
    args: [
      {
        name: 'Delimiter',
        type: 'option',
        value: 'Space',
        options: ['Space', 'None', 'Comma', 'Semi-colon', 'Colon', 'Line feed', '0x', '\\x'],
      },
      {
        name: 'Bytes per line',
        type: 'number',
        value: 0,
        min: 0,
        max: 1024,
        hint: '0 for one unbroken line',
      },
    ],
    run: (input, args) => {
      const name = String(arg(args, 'Delimiter', 'Space'));
      const between = HEX_DELIMITERS[name] ?? ' ';
      const prefix = name === '0x' ? '0x' : name === '\\x' ? '\\x' : '';
      const perLine = Math.max(0, Math.trunc(Number(arg(args, 'Bytes per line', 0))));

      const cells = Array.from(asBytes(input), (b) => prefix + b.toString(16).padStart(2, '0'));
      if (perLine === 0) return cells.join(between);

      const lines: string[] = [];
      for (let i = 0; i < cells.length; i += perLine) {
        lines.push(cells.slice(i, i + perLine).join(between));
      }
      return lines.join('\n');
    },
  },
  {
    id: 'url-decode',
    name: 'URL Decode',
    category: 'Data format',
    description: 'Converts percent-encoded characters back to their original form.',
    aliases: ['percent decode', 'unescape url', 'urldecode'],
    args: [{ name: 'Treat + as space', type: 'boolean', value: true }],
    run: (input, args) => {
      const prepared = arg(args, 'Treat + as space', true) ? input.replace(/\+/g, ' ') : input;
      try {
        return decodeURIComponent(prepared);
      } catch {
        throw new OperationError('Input contains an invalid percent-escape sequence.');
      }
    },
    detection: {
      formatName: 'URL encoding',
      pattern: /%[0-9a-fA-F]{2}/,
      minLength: 3,
    },
  },
  {
    id: 'url-encode',
    name: 'URL Encode',
    category: 'Data format',
    description: 'Percent-encodes characters that are unsafe in a URL.',
    aliases: ['percent encode', 'urlencode'],
    args: [{ name: 'Encode all special chars', type: 'boolean', value: false }],
    run: (input, args) =>
      arg(args, 'Encode all special chars', false)
        ? encodeURIComponent(input).replace(/[!'()*.\-_~]/g, (c) => {
            const code = c.charCodeAt(0).toString(16).toUpperCase();
            return `%${code.padStart(2, '0')}`;
          })
        : encodeURIComponent(input),
  },
  {
    id: 'from-html-entity',
    name: 'From HTML Entity',
    category: 'Data format',
    description: 'Converts HTML entities back to the characters they represent.',
    aliases: ['html decode', 'unescape html'],
    args: [],
    run: (input) =>
      input
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
          String.fromCodePoint(parseInt(hex, 16)),
        )
        .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
        .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, name: string) => {
          const map: Record<string, string> = {
            amp: '&',
            lt: '<',
            gt: '>',
            quot: '"',
            apos: "'",
            nbsp: ' ',
          };
          return map[name] ?? _;
        }),
    detection: {
      formatName: 'HTML entities',
      pattern: /&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos|nbsp);/,
      minLength: 4,
    },
  },
  {
    id: 'to-html-entity',
    name: 'To HTML Entity',
    category: 'Data format',
    description: 'Escapes characters that have special meaning in HTML.',
    aliases: ['html encode', 'escape html'],
    args: [],
    run: (input) => input.replace(/[&<>"']/g, (c) => HTML_ENTITIES[c] ?? c),
  },
  {
    id: 'from-binary',
    name: 'From Binary',
    category: 'Data format',
    description: 'Converts a string of 1s and 0s back to data.',
    aliases: ['binary decode', 'bin2str'],
    args: [],
    run: (input) => {
      const bits = input.replace(/[^01]/g, '');
      if (bits.length === 0) throw new OperationError('No binary digits found.');
      if (bits.length % 8 !== 0) {
        throw new OperationError('Binary input is not a whole number of bytes.');
      }
      const bytes = new Uint8Array(bits.length / 8);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(bits.substr(i * 8, 8), 2);
      }
      return bytesToLatin1(bytes);
    },
    detection: {
      formatName: 'Binary',
      pattern: /^[01\s]{16,}$/,
      minLength: 16,
    },
  },
  {
    id: 'to-binary',
    name: 'To Binary',
    category: 'Data format',
    description: 'Converts data to a string of 1s and 0s.',
    aliases: ['binary encode', 'str2bin'],
    args: [],
    run: (input) =>
      Array.from(asBytes(input))
        .map((b) => b.toString(2).padStart(8, '0'))
        .join(' '),
  },
  {
    id: 'from-decimal',
    name: 'From Decimal',
    category: 'Data format',
    description: 'Converts a list of decimal byte values back to data.',
    aliases: ['decimal decode', 'dec2str'],
    args: [],
    run: (input) => {
      const parts = input.split(/[\s,]+/).filter(Boolean);
      const bytes = new Uint8Array(parts.length);
      parts.forEach((part, i) => {
        const value = Number(part);
        if (!Number.isInteger(value) || value < 0 || value > 255) {
          throw new OperationError(`'${part}' is not a byte value between 0 and 255.`);
        }
        bytes[i] = value;
      });
      return bytesToLatin1(bytes);
    },
  },
  {
    id: 'to-decimal',
    name: 'To Decimal',
    category: 'Data format',
    description: 'Converts data to a list of decimal byte values.',
    aliases: ['decimal encode', 'str2dec'],
    args: [],
    run: (input) => Array.from(asBytes(input)).join(' '),
  },
  {
    id: 'unescape-unicode',
    name: 'Unescape Unicode Characters',
    category: 'Data format',
    description: 'Converts \\u-escaped sequences back to characters.',
    aliases: ['unicode decode', 'unescape'],
    args: [],
    run: (input) =>
      input
        .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex: string) =>
          String.fromCodePoint(parseInt(hex, 16)),
        )
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16))),
    detection: {
      pattern: /\\u[0-9a-fA-F]{4}|\\x[0-9a-fA-F]{2}/,
      minLength: 6,
    },
  },
  {
    id: 'escape-unicode',
    name: 'Escape Unicode Characters',
    category: 'Data format',
    description: 'Converts non-ASCII characters to \\u-escaped sequences.',
    aliases: ['unicode encode', 'escape'],
    args: [],
    run: (input) =>
      Array.from(input)
        .map((char) => {
          const code = char.codePointAt(0) ?? 0;
          return code > 127 ? `\\u${code.toString(16).padStart(4, '0')}` : char;
        })
        .join(''),
  },
  {
    id: 'from-utf16le',
    name: 'From UTF-16LE',
    category: 'Data format',
    description: 'Decodes UTF-16 little-endian text, the encoding Windows tooling emits.',
    aliases: ['utf16', 'utf-16le', 'unicode decode', 'widechar', 'powershell encodedcommand'],
    args: [],
    run: (input) => {
      const bytes = asBytes(input);
      const trimmed = bytes.length % 2 === 0 ? bytes : bytes.subarray(0, bytes.length - 1);
      const decoded = new TextDecoder('utf-16le').decode(trimmed as BufferSource);
      if (decoded.length === 0) throw new OperationError('No UTF-16LE text found.');
      return decoded;
    },
    detection: {
      formatName: 'UTF-16LE',
      minLength: 8,
      test: (_text, bytes) => {
        const ratio = utf16leRatio(bytes);
        if (ratio < 0.8) return null;
        return {
          label: `${Math.round(ratio * 100)}% UTF-16LE pairs`,
          detail:
            'Almost every other byte is a null, which is what ASCII text looks like when it is ' +
            'stored as UTF-16 little-endian — the encoding PowerShell uses for -EncodedCommand.',
        };
      },
    },
  },
  {
    id: 'to-hexdump',
    name: 'To Hexdump',
    category: 'Data format',
    description: 'Formats data as a classic offset / hex / ASCII dump.',
    aliases: ['hexdump', 'xxd', 'hex view'],
    args: [],
    run: (input) => {
      const bytes = asBytes(input);
      const lines: string[] = [];
      for (let offset = 0; offset < bytes.length; offset += 16) {
        const slice = bytes.subarray(offset, offset + 16);
        const hex = Array.from(slice)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(' ')
          .padEnd(47, ' ');
        const ascii = Array.from(slice)
          .map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.'))
          .join('');
        lines.push(`${offset.toString(16).padStart(8, '0')}  ${hex}  |${ascii}|`);
      }
      return lines.join('\n');
    },
  },
  {
    id: 'from-hexdump',
    name: 'From Hexdump',
    category: 'Data format',
    description: 'Extracts the data from a hexdump, ignoring offsets and the ASCII column.',
    aliases: ['parse hexdump', 'undump'],
    args: [],
    run: (input) => {
      const hex = input
        .split('\n')
        .map((line) => {
          const withoutAscii = line.replace(/\|.*\|?\s*$/, '');
          return withoutAscii.replace(/^\s*[0-9a-fA-F]{4,}:?\s/, '');
        })
        .join(' ')
        .replace(/[^0-9a-fA-F]/g, '');
      if (hex.length % 2 !== 0) throw new OperationError('Hexdump body has an odd digit count.');
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
      return bytesToLatin1(bytes);
    },
    detection: {
      formatName: 'Hexdump',
      pattern: /^[0-9a-fA-F]{8}\s{2}([0-9a-fA-F]{2}\s)+/m,
      minLength: 24,
    },
  },
];
