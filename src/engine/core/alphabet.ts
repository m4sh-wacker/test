import { OperationError } from '../types';


export function expandAlphabet(spec: string): string {
  const source = spec.replace(/\[space\]/gi, ' ');
  let out = '';

  for (let i = 0; i < source.length; i++) {
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
  chars: string;
  pad: string | null;
}

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
    const group = 8 / gcd(8, width);
    while (out.length % group !== 0) out += pad;
  }

  return out;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export interface DecodeOptions {
  removeNonAlphabet?: boolean;
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
      if (firstPad !== -1 && [...body.slice(firstPad)].some((c) => c !== pad)) {
        throw new OperationError('Strict mode: padding appears before the end of the input.');
      }
    }
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
