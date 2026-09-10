import { OperationError } from '../types';

/**
 * Base-N over an arbitrary alphabet.
 *
 * Base64 is not one encoding, it is a family: the same bit-packing with
 * different characters over it. Standard and URL-safe are the two everyone
 * knows, and the rest — itoa64, y64, z64, Radix-64, uuencoding, BinHex, UNIX
 * crypt — are what you meet in the wild when something was encoded by a tool
 * that predates the RFC. Hard-coding two of them means the other eleven come
 * back as garbage rather than as data.
 *
 * The alphabet is written as a range expression, the notation these are
 * conventionally published in: `A-Za-z0-9+/=` rather than sixty-five listed
 * characters.
 */

/**
 * Expands `A-Za-z0-9+/=` into the characters it stands for.
 *
 * A `-` between two characters is a range; anywhere else it is itself, which is
 * what makes `A-Za-z0-9-_` work — the second `-` is a literal because nothing
 * follows it to range to. `[space]` is spelled out because a leading literal
 * space is invisible in a settings field and impossible to type confidently.
 */
export function expandAlphabet(spec: string): string {
  const source = spec.replace(/\[space\]/gi, ' ');
  let out = '';

  for (let i = 0; i < source.length; i++) {
    // A backslash makes the next character a literal. Without it there is no
    // way to write an alphabet that contains a dash *as a value*, which is
    // exactly what the filename-safe and xx-encoding alphabets do — and both
    // silently came out the wrong length: `+-=` read as a nineteen-character
    // range from '+' to '=' rather than as three characters.
    if (source[i] === '\\' && i + 1 < source.length) {
      out += source[i + 1];
      i += 1;
      continue;
    }

    const isRange = source[i + 1] === '-' && i + 2 < source.length && source[i + 2] !== '\\';
    if (!isRange) {
      out += source[i];
      continue;
    }
    const from = source.charCodeAt(i);
    const to = source.charCodeAt(i + 2);
    if (to < from) throw new OperationError(`'${source[i]}-${source[i + 2]}' is not a range.`);
    for (let code = from; code <= to; code++) out += String.fromCharCode(code);
    i += 2;
  }

  return out;
}

interface Alphabet {
  /** The 64 value characters, in order. */
  chars: string;
  /** The padding character, where the alphabet declares one. */
  pad: string | null;
}

/**
 * Splits an expanded alphabet into its values and its padding.
 *
 * A 65-character alphabet is 64 values and a pad; 64 characters is an alphabet
 * that does not pad at all, which is how the URL-safe and y64 variants are
 * normally written.
 */
export function readAlphabet(spec: string, expected = 64): Alphabet {
  const chars = expandAlphabet(spec);

  if (chars.length === expected) return { chars, pad: null };
  if (chars.length === expected + 1) {
    return { chars: chars.slice(0, expected), pad: chars[expected] ?? null };
  }

  throw new OperationError(
    `An alphabet for this needs ${expected} characters, or ${expected + 1} with padding. This one has ${chars.length}.`,
  );
}

/** Bits per character: 6 for base64, 5 for base32. */
function widthFor(size: number): number {
  return Math.log2(size);
}

export function encodeBaseN(bytes: Uint8Array, spec: string, size = 64): string {
  const { chars, pad } = readAlphabet(spec, size);
  const width = widthFor(size);

  let bits = 0;
  let value = 0;
  let out = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= width) {
      out += chars[(value >>> (bits - width)) & (size - 1)];
      bits -= width;
    }
  }
  if (bits > 0) out += chars[(value << (width - bits)) & (size - 1)];

  if (pad) {
    // Groups of lcm(8, width) / width characters: 4 for base64, 8 for base32.
    const group = 8 / gcd(8, width);
    while (out.length % group !== 0) out += pad;
  }

  return out;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export interface DecodeOptions {
  /**
   * Drop anything outside the alphabet instead of refusing.
   *
   * On by default because real payloads arrive wrapped in quotes, split across
   * lines, or with a stray comma from whatever copied them. Off is for when you
   * need to know the input was clean.
   */
  removeNonAlphabet?: boolean;
  /**
   * Insist the input is exactly what the encoder would have produced: a whole
   * number of groups, padding where padding belongs, and no padding in the
   * middle. Useful for telling real Base64 from something that merely survives
   * being read as Base64.
   */
  strict?: boolean;
}

export function decodeBaseN(
  text: string,
  spec: string,
  size = 64,
  options: DecodeOptions = {},
): Uint8Array {
  const { removeNonAlphabet = true, strict = false } = options;
  const { chars, pad } = readAlphabet(spec, size);
  const width = widthFor(size);
  const group = 8 / gcd(8, width);

  let body = text;
  if (removeNonAlphabet) {
    const allowed = new Set(chars + (pad ?? ''));
    body = [...body].filter((c) => allowed.has(c)).join('');
  } else {
    const stray = [...body].find((c) => !chars.includes(c) && c !== pad);
    if (stray !== undefined) {
      throw new OperationError(
        `'${stray}' is not in this alphabet. Turn on 'Remove non-alphabet chars' to ignore it.`,
      );
    }
  }

  if (pad) {
    if (strict) {
      if (body.length % group !== 0) {
        throw new OperationError(`Strict mode: the input is not a whole number of ${group}-character groups.`);
      }
      const firstPad = body.indexOf(pad);
      // Once padding starts it has to run to the end. Padding in the middle is
      // two concatenated messages, which is a thing worth being told about.
      if (firstPad !== -1 && [...body.slice(firstPad)].some((c) => c !== pad)) {
        throw new OperationError('Strict mode: padding appears before the end of the input.');
      }
    }
    // Every pad character goes, not only the trailing run. Padding carries no
    // data, and two padded messages concatenated is a thing that actually
    // happens — a log line with two tokens in it. Refusing to decode that is
    // the strict answer, and strict mode above has already given it; here the
    // job is to get as far as the bytes allow.
    body = body.split(pad).join('');
  } else if (strict && body.length % group !== 0) {
    throw new OperationError(`Strict mode: the input is not a whole number of ${group}-character groups.`);
  }

  const index = new Map<string, number>();
  for (let i = 0; i < chars.length; i++) index.set(chars[i]!, i);

  let bits = 0;
  let value = 0;
  const out: number[] = [];

  for (const char of body) {
    const digit = index.get(char);
    if (digit === undefined) throw new OperationError(`'${char}' is not in this alphabet.`);
    value = (value << width) | digit;
    bits += width;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(out);
}
