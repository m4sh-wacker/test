import { OperationError } from '../types';
import { asBytes } from '../core/bytes';
import { arg, type Operation } from './types';

/**
 * Context-triggered piecewise hashing — ssdeep, and the CTPH it implements.
 *
 * An ordinary hash answers "are these the same file?". A fuzzy hash answers
 * "are these nearly the same file?", which is the question that actually comes
 * up: two samples of one malware family, a document before and after an edit, a
 * config with one line changed.
 *
 * It works by hashing pieces rather than the whole thing, and choosing where
 * the pieces end using a rolling hash over the *content* — so inserting a byte
 * near the start shifts every boundary after it back by one byte rather than
 * changing every piece. Each piece contributes one character, and the result is
 * two strings of at most 64 characters, one at a block size and one at twice it,
 * so that files of somewhat different sizes still have a comparable pair.
 *
 * Note on interoperability: this follows Tridgell's published spamsum
 * algorithm, with the same constants, window and alphabet. It has not been
 * checked against libfuzzy itself, because there is no copy of it on this
 * machine to check against — so treat a comparison between a hash from here and
 * a hash from `ssdeep` as unconfirmed until you have compared one pair by hand.
 * Comparisons between two hashes from here are exact.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const WINDOW = 7;
const MIN_BLOCK = 3;
const LENGTH = 64;
const FNV_PRIME = 0x01000193;
const HASH_INIT = 0x28021967;

/** Tridgell's rolling hash: three cheap accumulators over a seven-byte window. */
class Rolling {
  private readonly window = new Uint8Array(WINDOW);
  private h1 = 0;
  private h2 = 0;
  private h3 = 0;
  private at = 0;

  update(byte: number): number {
    this.h2 = (this.h2 - this.h1 + WINDOW * byte) >>> 0;
    this.h1 = (this.h1 + byte - this.window[this.at]!) >>> 0;
    this.window[this.at] = byte;
    this.at = (this.at + 1) % WINDOW;

    this.h3 = ((this.h3 << 5) >>> 0) ^ byte;
    this.h3 = this.h3 >>> 0;

    return (this.h1 + this.h2 + this.h3) >>> 0;
  }
}

/** FNV-1, 32-bit, which is what spamsum uses for the piece hashes. */
function fnv(hash: number, byte: number): number {
  return (Math.imul(hash, FNV_PRIME) ^ byte) >>> 0;
}

function spamsum(data: Uint8Array, forcedBlockSize?: number): string {
  let blockSize = forcedBlockSize ?? MIN_BLOCK;
  if (forcedBlockSize === undefined) {
    while (blockSize * LENGTH < data.length) blockSize *= 2;
  }

  for (;;) {
    const rolling = new Rolling();
    let left = '';
    let right = '';
    let h1 = HASH_INIT;
    let h2 = HASH_INIT;

    for (const byte of data) {
      h1 = fnv(h1, byte);
      h2 = fnv(h2, byte);
      const trigger = rolling.update(byte);

      // A boundary is a rolling hash that lands on the last residue of the
      // block size — content-defined, so an insertion moves it rather than
      // changing every piece after it.
      if (trigger % blockSize === blockSize - 1 && left.length < LENGTH - 1) {
        left += ALPHABET[h1 & 63];
        h1 = HASH_INIT;
      }
      if (trigger % (blockSize * 2) === blockSize * 2 - 1 && right.length < LENGTH / 2 - 1) {
        right += ALPHABET[h2 & 63];
        h2 = HASH_INIT;
      }
    }

    // Whatever is left over after the last boundary is a piece too.
    if (data.length > 0) {
      left += ALPHABET[h1 & 63];
      right += ALPHABET[h2 & 63];
    }

    // Too few pieces means the block size was too coarse to describe the file.
    if (forcedBlockSize === undefined && blockSize > MIN_BLOCK && left.length < LENGTH / 2) {
      blockSize = Math.floor(blockSize / 2);
      continue;
    }
    return `${blockSize}:${left}:${right}`;
  }
}

/* ------------------------------------------------------------ comparison */

/** Collapses any run longer than three, which stops repetition dominating. */
function eliminateSequences(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (
      i > 2 &&
      c === text[i - 1] &&
      c === text[i - 2] &&
      c === text[i - 3]
    ) {
      continue;
    }
    out += c;
  }
  return out;
}

/** The weighted edit distance spamsum scores with: 1 to insert or delete, 3 to change. */
function editDistance(a: string, b: string): number {
  const previous = new Array<number>(b.length + 1);
  const current = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) previous[j] = j;

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const change = a[i - 1] === b[j - 1] ? previous[j - 1]! : previous[j - 1]! + 3;
      current[j] = Math.min(current[j - 1]! + 1, previous[j]! + 1, change);
    }
    for (let j = 0; j <= b.length; j++) previous[j] = current[j]!;
  }
  return previous[b.length]!;
}

/** Both strings must share a run of seven, or they are declared unrelated. */
function hasCommonSubstring(a: string, b: string): boolean {
  const length = 7;
  if (a.length < length || b.length < length) return false;
  const seen = new Set<string>();
  for (let i = 0; i + length <= a.length; i++) seen.add(a.slice(i, i + length));
  for (let i = 0; i + length <= b.length; i++) {
    if (seen.has(b.slice(i, i + length))) return true;
  }
  return false;
}

function scorePair(a: string, b: string, blockSize: number): number {
  const left = eliminateSequences(a);
  const right = eliminateSequences(b);
  if (left.length === 0 || right.length === 0) return 0;
  if (!hasCommonSubstring(left, right)) return 0;

  let score = editDistance(left, right);
  score = Math.floor((score * LENGTH) / (left.length + right.length));
  score = Math.floor((100 * score) / LENGTH);
  score = 100 - score;

  // A small block size cannot support a high score: with few pieces, agreement
  // is cheap, so the result is capped by how much evidence there actually was.
  const cap = Math.floor((blockSize / MIN_BLOCK) * Math.min(left.length, right.length));
  return Math.max(0, Math.min(score, cap, 100));
}

interface Parsed {
  blockSize: number;
  left: string;
  right: string;
}

function parse(text: string, what: string): Parsed {
  const parts = text.trim().split(':');
  if (parts.length < 3) {
    throw new OperationError(`${what} is not a fuzzy hash: it should read blocksize:hash:hash.`);
  }
  const blockSize = Number(parts[0]);
  if (!Number.isInteger(blockSize) || blockSize < 1) {
    throw new OperationError(`${what} does not start with a block size.`);
  }
  return { blockSize, left: parts[1]!, right: parts[2]! };
}

export function compareFuzzy(first: string, second: string): number {
  const a = parse(first, 'The first hash');
  const b = parse(second, 'The second hash');

  if (a.blockSize === b.blockSize) {
    return Math.max(
      scorePair(a.left, b.left, a.blockSize),
      scorePair(a.right, b.right, a.blockSize * 2),
    );
  }
  // The two halves exist so that files an octave apart in size still line up.
  if (a.blockSize === b.blockSize * 2) return scorePair(a.left, b.right, a.blockSize);
  if (b.blockSize === a.blockSize * 2) return scorePair(a.right, b.left, b.blockSize);
  return 0;
}

/* ------------------------------------------------------------ operations */

const HASH_ARGS = [
  {
    name: 'Block size',
    type: 'number' as const,
    value: 0,
    min: 0,
    hint: '0 chooses one from the length, as ssdeep does',
  },
];

export const fuzzyHashOperations: Operation[] = [
  {
    id: 'ssdeep',
    name: 'SSDEEP',
    category: 'Hashing',
    description: 'The ssdeep fuzzy hash, which is similar for files that are similar.',
    aliases: ['fuzzy hash', 'similarity hash', 'spamsum'],
    budgetMs: 30000,
    args: HASH_ARGS,
    run: (input, args) => {
      const forced = Number(arg(args, 'Block size', 0));
      return spamsum(asBytes(input), forced > 0 ? forced : undefined);
    },
  },
  {
    id: 'ctph',
    name: 'CTPH',
    category: 'Hashing',
    description: 'Context-triggered piecewise hashing, the algorithm ssdeep is built on.',
    aliases: ['context triggered piecewise hashing', 'piecewise hash'],
    budgetMs: 30000,
    args: HASH_ARGS,
    run: (input, args) => {
      const forced = Number(arg(args, 'Block size', 0));
      return spamsum(asBytes(input), forced > 0 ? forced : undefined);
    },
  },
  {
    id: 'compare-ssdeep-hashes',
    name: 'Compare SSDEEP hashes',
    category: 'Hashing',
    description: 'Scores two ssdeep hashes from 0 to 100 by how similar the files were.',
    aliases: ['ssdeep compare', 'fuzzy hash compare', 'similarity score'],
    budgetMs: 30000,
    args: [
      {
        name: 'Second hash',
        type: 'string',
        value: '',
        hint: 'Leave empty to compare two hashes given one per line',
      },
    ],
    run: (input, args) => {
      const other = String(arg(args, 'Second hash', '')).trim();
      const lines = input
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const [first, second] =
        other.length > 0 ? [lines[0] ?? '', other] : [lines[0] ?? '', lines[1] ?? ''];
      if (!first || !second) {
        throw new OperationError('Two hashes are needed: one per line, or one in the argument.');
      }

      const score = compareFuzzy(first, second);
      return `${score}`;
    },
  },
  {
    id: 'compare-ctph-hashes',
    name: 'Compare CTPH hashes',
    category: 'Hashing',
    description: 'Scores two context-triggered piecewise hashes from 0 to 100.',
    aliases: ['ctph compare', 'piecewise hash compare'],
    budgetMs: 30000,
    args: [{ name: 'Second hash', type: 'string', value: '' }],
    run: (input, args) => {
      const other = String(arg(args, 'Second hash', '')).trim();
      const lines = input
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const [first, second] =
        other.length > 0 ? [lines[0] ?? '', other] : [lines[0] ?? '', lines[1] ?? ''];
      if (!first || !second) {
        throw new OperationError('Two hashes are needed: one per line, or one in the argument.');
      }
      return `${compareFuzzy(first, second)}`;
    },
  },
];
