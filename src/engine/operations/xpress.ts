import { OperationError } from '../types';
import { asBytes, bytesToLatin1 } from '../core/bytes';
import { arg, type Operation } from './types';

/**
 * Microsoft's XPRESS compression, both variants of it.
 *
 * It is everywhere inside Windows and almost nowhere outside it: hibernation
 * files, Windows Update deltas, prefetch files, Active Directory replication,
 * shadow copies, and the memory pages the compression store keeps. Anyone
 * pulling artefacts off a Windows machine meets it, and nothing else will read
 * it for them.
 *
 * There are two encodings under the one name. Plain LZ77 keeps a running
 * thirty-two-bit word of flags, one bit per item, saying whether the next thing
 * is a literal or a match. The Huffman variant puts a 256-byte table of code
 * lengths in front of each 64 KiB chunk and codes literals and match headers as
 * one 512-symbol alphabet — where a symbol above 255 carries both the match
 * length and how many offset bits follow it.
 */

class Input {
  at = 0;

  constructor(readonly bytes: Uint8Array) {}

  get remaining(): number {
    return this.bytes.length - this.at;
  }

  byte(): number {
    if (this.at >= this.bytes.length) {
      throw new OperationError('The compressed data ends in the middle of an item.');
    }
    return this.bytes[this.at++]!;
  }

  u16(): number {
    return this.byte() | (this.byte() << 8);
  }

  u32(): number {
    return (this.u16() | (this.u16() << 16)) >>> 0;
  }
}

/** Guards a decompression bomb: a few bytes of input can ask for gigabytes. */
const MAX_OUTPUT = 64 * 1024 * 1024;

function grow(out: number[], length: number): void {
  if (out.length + length > MAX_OUTPUT) {
    throw new OperationError('This data expands past 64 MB, which is more than a tab should hold.');
  }
}

/* ------------------------------------------------------------ plain LZ77 */

function decompressLz77(bytes: Uint8Array): Uint8Array {
  const input = new Input(bytes);
  const out: number[] = [];

  let flags = 0;
  let flagsLeft = 0;
  // A match length of seven is spelled out in a half-byte, and two consecutive
  // long matches share one byte between them — hence this cursor, which points
  // at the byte whose high nibble the next long match will use.
  let halfByteAt = -1;

  while (input.remaining > 0 || flagsLeft > 0) {
    if (flagsLeft === 0) {
      if (input.remaining < 4) break;
      flags = input.u32();
      flagsLeft = 32;
    }
    flagsLeft--;

    if ((flags & (1 << flagsLeft)) === 0) {
      if (input.remaining === 0) break;
      grow(out, 1);
      out.push(input.byte());
      continue;
    }

    if (input.remaining === 0) break;
    const header = input.u16();
    let length = header & 7;
    const offset = (header >> 3) + 1;

    if (length === 7) {
      if (halfByteAt < 0) {
        halfByteAt = input.at;
        length = input.byte() & 0x0f;
      } else {
        length = bytes[halfByteAt]! >> 4;
        halfByteAt = -1;
      }

      if (length === 15) {
        length = input.byte();
        if (length === 255) {
          length = input.u16();
          if (length === 0) length = input.u32();
          if (length < 15 + 7) {
            throw new OperationError('A match declares a length shorter than its own encoding.');
          }
          length -= 15 + 7;
        }
        length += 15;
      }
      length += 7;
    }
    length += 3;

    if (offset > out.length) {
      throw new OperationError(
        `A match points ${offset} bytes back, but only ${out.length} have been produced.`,
      );
    }
    grow(out, length);
    for (let i = 0; i < length; i++) out.push(out[out.length - offset]!);
  }

  return new Uint8Array(out);
}

/* --------------------------------------------------------- LZ77 + Huffman */

const SYMBOLS = 512;
const CHUNK = 65536;

interface Huffman {
  /** For each code length: its first canonical code, and where its symbols start. */
  first: Int32Array;
  offset: Int32Array;
  count: Int32Array;
  sorted: Int32Array;
  maxLength: number;
}

function buildHuffman(lengths: Uint8Array): Huffman {
  const count = new Int32Array(16);
  for (const length of lengths) if (length > 0) count[length]! += 1;

  const first = new Int32Array(16);
  const offset = new Int32Array(16);
  let code = 0;
  let index = 0;
  let maxLength = 0;

  for (let length = 1; length < 16; length++) {
    first[length] = code;
    offset[length] = index;
    code = (code + count[length]!) << 1;
    index += count[length]!;
    if (count[length]! > 0) maxLength = length;
  }

  const sorted = new Int32Array(index);
  const cursor = offset.slice();
  for (let symbol = 0; symbol < lengths.length; symbol++) {
    const length = lengths[symbol]!;
    if (length > 0) sorted[cursor[length]!++] = symbol;
  }

  return { first, offset, count, sorted, maxLength };
}

/**
 * The bit reader XPRESS Huffman uses: sixteen-bit little-endian words, consumed
 * from the most significant bit.
 *
 * Two words are always buffered ahead, and the extra length bytes a long match
 * needs are read from the raw stream *after* them — so the byte cursor and the
 * bit cursor are deliberately not the same thing.
 */
class BitReader {
  private buffer = 0;
  private bits = 0;

  constructor(private readonly input: Input) {
    this.buffer = ((this.word() << 16) | this.word()) >>> 0;
    this.bits = 16;
  }

  /** Counts the bytes invented past the end, which is how the last chunk ends. */
  overrun = 0;

  private word(): number {
    if (this.input.remaining < 2) {
      this.overrun += 2;
      return 0;
    }
    return this.input.u16();
  }

  peek(count: number): number {
    return count === 0 ? 0 : this.buffer >>> (32 - count);
  }

  skip(count: number): void {
    this.buffer = (this.buffer << count) >>> 0;
    this.bits -= count;
    if (this.bits <= 0) {
      this.buffer = (this.buffer | (this.word() << -this.bits)) >>> 0;
      this.bits += 16;
    }
  }

  take(count: number): number {
    const value = this.peek(count);
    this.skip(count);
    return value;
  }

  /** Extra length bytes come from the stream itself, past the buffered words. */
  byte(): number {
    if (this.input.remaining === 0) {
      this.overrun += 1;
      return 0;
    }
    return this.input.byte();
  }

  u16(): number {
    return this.byte() | (this.byte() << 8);
  }
}

function decodeSymbol(reader: BitReader, table: Huffman): number {
  let code = 0;
  for (let length = 1; length <= table.maxLength; length++) {
    code = (code << 1) | reader.take(1);
    const available = table.count[length]!;
    const first = table.first[length]!;
    if (available > 0 && code >= first && code - first < available) {
      const symbol = table.sorted[table.offset[length]! + (code - first)];
      if (symbol !== undefined) return symbol;
    }
  }
  throw new OperationError('A Huffman code in this chunk is not in the table.');
}

/**
 * Decodes the chunks of an XPRESS Huffman stream.
 *
 * The format does not say where the data ends. Windows always knows the
 * decompressed size from somewhere else — the file record, the page table, the
 * API's destination buffer — so a chunk simply stops after 64 KiB and the last
 * one stops when the caller has what it asked for. Pass `expected` when the
 * size is known; without it, decoding stops when the stream runs out and the
 * reader is producing nothing but padding, which can leave a few trailing bytes
 * that were never really there.
 */
function decodeItem(reader: BitReader, table: Huffman, out: number[]): void {
  const symbol = decodeSymbol(reader, table);
  if (symbol < 256) {
    grow(out, 1);
    out.push(symbol);
    return;
  }

  const value = symbol - 256;
  let length = value & 0x0f;
  const offsetBits = value >> 4;

  if (length === 15) {
    length = reader.byte() + 15;
    if (length === 270) length = reader.u16();
  }
  const offset = (1 << offsetBits) | reader.take(offsetBits);
  length += 3;

  if (offset > out.length) {
    throw new OperationError(
      `A match points ${offset} bytes back, but only ${out.length} have been produced.`,
    );
  }
  grow(out, length);
  for (let i = 0; i < length; i++) out.push(out[out.length - offset]!);
}

function decompressHuffman(bytes: Uint8Array, expected: number): Uint8Array {
  const input = new Input(bytes);
  const out: number[] = [];

  while (input.remaining > 256 && (expected === 0 || out.length < expected)) {
    const lengths = new Uint8Array(SYMBOLS);
    for (let i = 0; i < 256; i++) {
      const byte = input.byte();
      lengths[i * 2] = byte & 0x0f;
      lengths[i * 2 + 1] = byte >> 4;
    }
    const table = buildHuffman(lengths);
    if (table.sorted.length === 0) {
      throw new OperationError('A chunk declares a Huffman table with no symbols in it.');
    }

    const reader = new BitReader(input);
    const chunkStart = out.length;
    const limit = expected > 0 ? Math.min(CHUNK, expected - chunkStart) : CHUNK;

    while (out.length - chunkStart < limit) {
      // Four invented bytes means the reader is past the end of the stream and
      // everything it returns from here on is padding.
      if (reader.overrun >= 4) break;
      try {
        decodeItem(reader, table, out);
      } catch (error) {
        // Padding at the end of the last chunk is not corruption: it is what
        // the format leaves behind when nobody records the size. Anything that
        // fails while the stream still has real bytes in it is a genuine fault.
        if (reader.overrun > 0) break;
        throw error;
      }
    }
  }

  if (out.length === 0) {
    throw new OperationError('No chunk was found: an XPRESS Huffman stream starts with a 256-byte table.');
  }
  return new Uint8Array(expected > 0 ? out.slice(0, expected) : out);
}

export const xpressOperations: Operation[] = [
  {
    id: 'xpress-decompress',
    name: 'XPRESS Decompress',
    category: 'Compression',
    description: "Decompresses Microsoft's plain LZ77 XPRESS, used throughout Windows.",
    aliases: ['ms-xca', 'xpress lz77', 'windows compression', 'rtldecompressbuffer'],
    budgetMs: 30000,
    args: [],
    run: (input) => {
      const bytes = asBytes(input);
      if (bytes.length < 4) throw new OperationError('There is not even a flag word here.');
      return bytesToLatin1(decompressLz77(bytes));
    },
  },
  {
    id: 'xpress-huffman-decompress',
    name: 'XPRESS LZ77+Huffman Decompress',
    category: 'Compression',
    description: "Decompresses Microsoft's XPRESS Huffman variant, one 64 KiB chunk at a time.",
    aliases: ['ms-xca huffman', 'xpress huff', 'windows compression huffman'],
    budgetMs: 30000,
    args: [
      {
        name: 'Decompressed size',
        type: 'number',
        value: 0,
        min: 0,
        hint: 'The format does not record it; 0 decodes until the stream runs out',
      },
    ],
    run: (input, args) => {
      const bytes = asBytes(input);
      if (bytes.length < 257) {
        throw new OperationError('An XPRESS Huffman chunk starts with a 256-byte table of code lengths.');
      }
      return bytesToLatin1(decompressHuffman(bytes, Math.max(0, Number(arg(args, 'Decompressed size', 0)))));
    },
  },
];
