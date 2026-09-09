import { asBytes } from '../core/bytes';
import { arg, type Operation } from './types';

/**
 * Whirlpool, the 512-bit hash of Barreto and Rijmen.
 *
 * It is an AES-shaped block cipher — substitute, shift, mix, add the key —
 * over an 8×8 byte state instead of 4×4, run in Miyaguchi-Preneel mode so the
 * message keys the cipher and the chaining value is the plaintext. NESSIE
 * selected it and ISO standardised it, and it still turns up in TrueCrypt
 * volumes, older PGP keyrings and a good deal of Brazilian and European
 * government software.
 *
 * Every table here is generated rather than transcribed. The S-box is built
 * from the two 4-bit mini-boxes the designers specified, and the round
 * constants fall out of the same S-box — so there is no page of hex constants
 * to have copied wrongly.
 */

/** The mini-boxes the S-box is built from, straight out of the specification. */
const E = [0x1, 0xb, 0x9, 0xc, 0xd, 0x6, 0xf, 0x3, 0xe, 0x8, 0x7, 0x4, 0xa, 0x2, 0x5, 0x0];
const R = [0x7, 0xc, 0xb, 0xd, 0xe, 0x4, 0x9, 0xf, 0x6, 0x3, 0x8, 0xa, 0x2, 0x5, 0x1, 0x0];

const SBOX = (() => {
  const inverse = new Array<number>(16);
  E.forEach((to, from) => {
    inverse[to] = from;
  });

  const box = new Uint8Array(256);
  for (let value = 0; value < 256; value++) {
    const high = E[value >> 4]!;
    const low = inverse[value & 0x0f]!;
    const middle = R[high ^ low]!;
    box[value] = (E[high ^ middle]! << 4) | inverse[low ^ middle]!;
  }
  return box;
})();

/** Doubling in GF(2⁸) with Whirlpool's reduction polynomial, x⁸+x⁴+x³+x²+1. */
function xtime(value: number): number {
  const doubled = value << 1;
  return (doubled & 0x100) !== 0 ? (doubled ^ 0x11d) & 0xff : doubled;
}

/**
 * The eight round tables.
 *
 * Each entry packs one S-box output multiplied by the circulant row
 * (1, 1, 4, 1, 8, 5, 2, 9), so a whole round is eight table lookups and eight
 * exclusive-ors per word instead of sixty-four field multiplications.
 */
const TABLES: BigUint64Array[] = (() => {
  const first = new BigUint64Array(256);
  for (let x = 0; x < 256; x++) {
    const v1 = SBOX[x]!;
    const v2 = xtime(v1);
    const v4 = xtime(v2);
    const v5 = v4 ^ v1;
    const v8 = xtime(v4);
    const v9 = v8 ^ v1;

    const bytes = [v1, v1, v4, v1, v8, v5, v2, v9];
    let word = 0n;
    for (const byte of bytes) word = (word << 8n) | BigInt(byte);
    first[x] = word;
  }

  const all = [first];
  for (let t = 1; t < 8; t++) {
    const previous = all[t - 1]!;
    const table = new BigUint64Array(256);
    // Each table is the one before it rotated right by a byte.
    for (let x = 0; x < 256; x++) {
      const value = previous[x]!;
      table[x] = ((value >> 8n) | (value << 56n)) & 0xffffffffffffffffn;
    }
    all.push(table);
  }
  return all;
})();

const ROUNDS = 10;

const ROUND_CONSTANTS = (() => {
  const constants: bigint[] = [];
  for (let r = 0; r < ROUNDS; r++) {
    let value = 0n;
    for (let j = 0; j < 8; j++) {
      const mask = 0xffn << BigInt(56 - 8 * j);
      value ^= TABLES[j]![8 * r + j]! & mask;
    }
    constants.push(value);
  }
  return constants;
})();

const MASK = 0xffffffffffffffffn;

function byteOf(word: bigint, index: number): number {
  return Number((word >> BigInt(56 - 8 * index)) & 0xffn);
}

/** One application of the round function: substitute, shift, mix. */
function transform(input: bigint[], out: bigint[]): void {
  for (let i = 0; i < 8; i++) {
    let value = 0n;
    for (let t = 0; t < 8; t++) {
      value ^= TABLES[t]![byteOf(input[(i - t) & 7]!, t)]!;
    }
    out[i] = value & MASK;
  }
}

function compress(hash: bigint[], block: bigint[]): void {
  const key = hash.slice();
  const state = block.map((word, i) => word ^ key[i]!);
  const scratch: bigint[] = new Array<bigint>(8).fill(0n);

  for (let round = 0; round < ROUNDS; round++) {
    transform(key, scratch);
    scratch[0] = scratch[0]! ^ ROUND_CONSTANTS[round]!;
    for (let i = 0; i < 8; i++) key[i] = scratch[i]!;

    transform(state, scratch);
    for (let i = 0; i < 8; i++) state[i] = (scratch[i]! ^ key[i]!) & MASK;
  }

  // Miyaguchi-Preneel: the new chaining value is cipher ⊕ key ⊕ plaintext.
  for (let i = 0; i < 8; i++) hash[i] = (hash[i]! ^ state[i]! ^ block[i]!) & MASK;
}

export function whirlpool(message: Uint8Array): Uint8Array {
  // The length is counted in bits and stored in 256 of them, which is why the
  // padding runs to 32 bytes before the end of a block rather than 8.
  const bitLength = BigInt(message.length) * 8n;
  const padded = new Uint8Array(((message.length + 32) >> 6) * 64 + 64);
  padded.set(message);
  padded[message.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setBigUint64(padded.length - 8, bitLength & MASK);
  view.setBigUint64(padded.length - 16, (bitLength >> 64n) & MASK);

  const hash: bigint[] = new Array<bigint>(8).fill(0n);
  const block: bigint[] = new Array<bigint>(8).fill(0n);

  for (let at = 0; at < padded.length; at += 64) {
    for (let i = 0; i < 8; i++) block[i] = view.getBigUint64(at + i * 8);
    compress(hash, block);
  }

  const out = new Uint8Array(64);
  const result = new DataView(out.buffer);
  hash.forEach((word, i) => result.setBigUint64(i * 8, word));
  return out;
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const whirlpoolOperations: Operation[] = [
  {
    id: 'whirlpool',
    name: 'Whirlpool',
    category: 'Hashing',
    description: 'The 512-bit Whirlpool digest, standardised in ISO/IEC 10118-3.',
    aliases: ['whirlpool-512', 'nessie hash', 'iso 10118'],
    args: [
      {
        name: 'Size',
        type: 'option',
        value: '512',
        options: ['512', '384', '256'],
        hint: 'Shorter sizes are the full digest truncated, as tools that offer them do',
      },
    ],
    run: (input, args) => {
      const digest = whirlpool(asBytes(input));
      const bits = Number(arg(args, 'Size', '512'));
      return hex(digest.subarray(0, bits / 8));
    },
  },
];
