/**
 * Character-set conversion, built on the platform's own encoding tables.
 *
 * `TextDecoder` already implements every label the WHATWG encoding standard
 * defines — around forty legacy code pages, single- and multi-byte — so there
 * is no table here to ship, to review, or to get wrong. What the platform does
 * not offer is the other direction: `TextEncoder` only ever emits UTF-8.
 *
 * So encoding is derived rather than tabulated. Decode every byte sequence a
 * code page can express, once, and invert the result. For a single-byte page
 * that is 256 decodes; for a legacy CJK page it is a few tens of thousands,
 * done on first use and then cached for the life of the page. The tables are
 * therefore always exactly the platform's own — they cannot drift from what
 * the decoder will do with the same bytes.
 *
 * The alternative was a code-page library. In a security tool every dependency
 * is somebody else's supply chain inside the threat model, and this is a
 * hundred lines.
 */

import { OperationError } from '../types';
import { bytesToLatin1 } from './bytes';

interface CharsetDefinition {
  /** What the user picks. */
  name: string;
  /** The WHATWG label handed to TextDecoder. */
  label: string;
  /** Whether a character can occupy more than one byte. */
  multiByte?: boolean;
  /** Stateful escape-based encodings cannot be inverted byte-pair by byte-pair. */
  decodeOnly?: boolean;
  /**
   * Code point equals byte value. Handled here rather than through the platform
   * because the WHATWG standard deliberately aliases `iso-8859-1` to
   * windows-1252, which fills 0x80-0x9F with punctuation instead of leaving it
   * as control characters. True Latin-1 is the identity map, and a forensic
   * tool that quietly substitutes a different code page is worse than one that
   * does not offer it.
   */
  identity?: boolean;
}

const DEFINITIONS: CharsetDefinition[] = [
  { name: 'UTF-8', label: 'utf-8' },
  { name: 'UTF-16LE', label: 'utf-16le' },
  { name: 'UTF-16BE', label: 'utf-16be' },
  { name: 'ISO-8859-1 (Latin-1)', label: 'iso-8859-1', identity: true },
  { name: 'ISO-8859-2 (Latin-2)', label: 'iso-8859-2' },
  { name: 'ISO-8859-3 (Latin-3)', label: 'iso-8859-3' },
  { name: 'ISO-8859-4 (Latin-4)', label: 'iso-8859-4' },
  { name: 'ISO-8859-5 (Cyrillic)', label: 'iso-8859-5' },
  { name: 'ISO-8859-6 (Arabic)', label: 'iso-8859-6' },
  { name: 'ISO-8859-7 (Greek)', label: 'iso-8859-7' },
  { name: 'ISO-8859-8 (Hebrew)', label: 'iso-8859-8' },
  { name: 'ISO-8859-10 (Latin-6)', label: 'iso-8859-10' },
  { name: 'ISO-8859-13 (Latin-7)', label: 'iso-8859-13' },
  { name: 'ISO-8859-14 (Latin-8)', label: 'iso-8859-14' },
  { name: 'ISO-8859-15 (Latin-9)', label: 'iso-8859-15' },
  { name: 'ISO-8859-16 (Latin-10)', label: 'iso-8859-16' },
  { name: 'KOI8-R (Russian)', label: 'koi8-r' },
  { name: 'KOI8-U (Ukrainian)', label: 'koi8-u' },
  { name: 'IBM866 (Cyrillic DOS)', label: 'ibm866' },
  { name: 'Macintosh (Roman)', label: 'macintosh' },
  { name: 'Mac Cyrillic', label: 'x-mac-cyrillic' },
  { name: 'Windows-874 (Thai)', label: 'windows-874' },
  { name: 'Windows-1250 (Central European)', label: 'windows-1250' },
  { name: 'Windows-1251 (Cyrillic)', label: 'windows-1251' },
  { name: 'Windows-1252 (Western European)', label: 'windows-1252' },
  { name: 'Windows-1253 (Greek)', label: 'windows-1253' },
  { name: 'Windows-1254 (Turkish)', label: 'windows-1254' },
  { name: 'Windows-1255 (Hebrew)', label: 'windows-1255' },
  { name: 'Windows-1256 (Arabic)', label: 'windows-1256' },
  { name: 'Windows-1257 (Baltic)', label: 'windows-1257' },
  { name: 'Windows-1258 (Vietnamese)', label: 'windows-1258' },
  { name: 'Shift-JIS (Japanese)', label: 'shift_jis', multiByte: true },
  { name: 'EUC-JP (Japanese)', label: 'euc-jp', multiByte: true },
  { name: 'ISO-2022-JP (Japanese)', label: 'iso-2022-jp', multiByte: true, decodeOnly: true },
  { name: 'EUC-KR (Korean)', label: 'euc-kr', multiByte: true },
  { name: 'GBK (Simplified Chinese)', label: 'gbk', multiByte: true },
  { name: 'GB18030 (Simplified Chinese)', label: 'gb18030', multiByte: true },
  { name: 'Big5 (Traditional Chinese)', label: 'big5', multiByte: true },
];

function supported(definition: CharsetDefinition): boolean {
  if (definition.identity) return true;
  try {
    new TextDecoder(definition.label);
    return true;
  } catch {
    // A runtime without the full ICU data set. Offering the option anyway would
    // be a menu entry that always fails.
    return false;
  }
}

const AVAILABLE = DEFINITIONS.filter(supported);
const BY_NAME = new Map(AVAILABLE.map((d) => [d.name, d]));

/** The character sets this runtime can actually convert, in menu order. */
export const CHARSET_NAMES: string[] = AVAILABLE.map((d) => d.name);

/** The ones that can be written as well as read. */
export const ENCODABLE_CHARSET_NAMES: string[] = AVAILABLE.filter((d) => !d.decodeOnly).map(
  (d) => d.name,
);

function definitionFor(name: string): CharsetDefinition {
  const found = BY_NAME.get(name);
  if (!found) throw new OperationError(`'${name}' is not a character set this browser has.`);
  return found;
}

export function decodeCharset(name: string, bytes: Uint8Array): string {
  const definition = definitionFor(name);
  if (definition.identity) return bytesToLatin1(bytes);
  return new TextDecoder(definition.label).decode(bytes);
}

/* --------------------------------------------------------- encoding tables */

const reverseTables = new Map<string, Map<string, number[]>>();

/**
 * Builds the code page's character-to-bytes table by asking the decoder.
 *
 * `fatal: true` matters: it makes an invalid sequence throw instead of quietly
 * becoming U+FFFD, which is the difference between a table and a table full of
 * replacement characters all mapping to the same byte.
 */
function reverseTable(definition: CharsetDefinition): Map<string, number[]> {
  const cached = reverseTables.get(definition.label);
  if (cached) return cached;

  const decoder = new TextDecoder(definition.label, { fatal: true });
  const table = new Map<string, number[]>();

  const single = new Uint8Array(1);
  for (let byte = 0; byte < 256; byte++) {
    single[0] = byte;
    try {
      const char = decoder.decode(single);
      if (!table.has(char)) table.set(char, [byte]);
    } catch {
      /* not a character on its own in this code page */
    }
  }

  if (definition.multiByte) {
    const pair = new Uint8Array(2);
    for (let lead = 0x80; lead < 0x100; lead++) {
      pair[0] = lead;
      for (let trail = 0x20; trail < 0x100; trail++) {
        pair[1] = trail;
        try {
          const char = decoder.decode(pair);
          if (!table.has(char)) table.set(char, [lead, trail]);
        } catch {
          /* not a valid pair */
        }
      }
    }
  }

  reverseTables.set(definition.label, table);
  return table;
}

function encodeUtf16(text: string, little: boolean): Uint8Array {
  const out = new Uint8Array(text.length * 2);
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    out[i * 2 + (little ? 0 : 1)] = unit & 0xff;
    out[i * 2 + (little ? 1 : 0)] = unit >> 8;
  }
  return out;
}

export function encodeCharset(name: string, text: string): Uint8Array {
  const definition = definitionFor(name);
  if (definition.decodeOnly) {
    throw new OperationError(`${definition.name} can be read but not written.`);
  }
  if (definition.identity) {
    const out = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code > 0xff) {
        throw new OperationError(`Latin-1 has no way to write '${text[i] ?? ''}'.`);
      }
      out[i] = code;
    }
    return out;
  }
  if (definition.label === 'utf-8') return new TextEncoder().encode(text);
  if (definition.label === 'utf-16le') return encodeUtf16(text, true);
  if (definition.label === 'utf-16be') return encodeUtf16(text, false);

  const table = reverseTable(definition);
  const out: number[] = [];
  for (const char of text) {
    const bytes = table.get(char);
    if (!bytes) {
      throw new OperationError(
        `${definition.name} has no way to write '${char}' (U+${(char.codePointAt(0) ?? 0)
          .toString(16)
          .toUpperCase()
          .padStart(4, '0')}).`,
      );
    }
    out.push(...bytes);
  }
  return new Uint8Array(out);
}

/** True when this runtime can write the named character set, not only read it. */
export function isEncodable(name: string): boolean {
  return BY_NAME.get(name)?.decodeOnly !== true && BY_NAME.has(name);
}

/**
 * Encodes for the input pane, where refusing is not an option.
 *
 * A character the chosen code page has no room for becomes a question mark —
 * what every other encoder on the platform does, and visible in the output
 * rather than hidden. Operations use `encodeCharset` instead and report the
 * problem, because there the conversion is the work rather than a setting.
 */
export function encodeCharsetLossy(name: string, text: string): Uint8Array {
  try {
    return encodeCharset(name, text);
  } catch {
    const out: number[] = [];
    for (const char of text) {
      try {
        out.push(...encodeCharset(name, char));
      } catch {
        out.push(0x3f);
      }
    }
    return new Uint8Array(out);
  }
}
