import { OperationError } from '../types';

/**
 * Block cipher modes of operation, shared by every block cipher here.
 *
 * A block cipher only ever transforms one block; everything that makes it
 * usable on a message — chaining, padding, the counter — is the mode, and is
 * the same whichever cipher sits underneath. Writing it once means a mistake
 * in CBC is a mistake in one place rather than in eight.
 */

export interface BlockCipher {
  readonly blockSize: number;
  encryptBlock(block: Uint8Array): Uint8Array;
  decryptBlock(block: Uint8Array): Uint8Array;
}

export const BLOCK_MODES = ['CBC', 'CFB', 'OFB', 'CTR', 'ECB'];
export const PADDING_OPTIONS = ['PKCS#7', 'None'];

function xorInto(target: Uint8Array, source: Uint8Array): void {
  for (let i = 0; i < target.length; i++) target[i] = (target[i] as number) ^ (source[i] as number);
}

function pad(data: Uint8Array, blockSize: number): Uint8Array {
  // PKCS#7 always adds a block when the data already fits, so the last byte is
  // never ambiguous about how much to remove.
  const count = blockSize - (data.length % blockSize);
  const out = new Uint8Array(data.length + count);
  out.set(data);
  out.fill(count, data.length);
  return out;
}

function unpad(data: Uint8Array, blockSize: number): Uint8Array {
  if (data.length === 0) return data;
  const count = data[data.length - 1] as number;
  if (count === 0 || count > blockSize || count > data.length) {
    throw new OperationError('The padding is not valid — check the key and the mode.');
  }
  for (let i = data.length - count; i < data.length; i++) {
    if (data[i] !== count) {
      throw new OperationError('The padding is not valid — check the key and the mode.');
    }
  }
  return data.subarray(0, data.length - count);
}

function checkIv(mode: string, iv: Uint8Array, blockSize: number): void {
  if (mode === 'ECB') return;
  if (iv.length !== blockSize) {
    throw new OperationError(
      `${mode} needs an IV of exactly ${blockSize} bytes; this one is ${iv.length}.`,
    );
  }
}

/** Increments a counter block in place, big-endian, as CTR mode requires. */
function increment(counter: Uint8Array): void {
  for (let i = counter.length - 1; i >= 0; i--) {
    counter[i] = ((counter[i] as number) + 1) & 0xff;
    if (counter[i] !== 0) return;
  }
}

export function encryptBlocks(
  cipher: BlockCipher,
  data: Uint8Array,
  mode: string,
  iv: Uint8Array,
  padding: string,
): Uint8Array {
  const size = cipher.blockSize;
  checkIv(mode, iv, size);

  // The stream modes turn the cipher into a keystream generator, so they take
  // the data as it is; only the true block modes need whole blocks.
  const streaming = mode === 'CFB' || mode === 'OFB' || mode === 'CTR';
  const input = streaming || padding === 'None' ? data : pad(data, size);
  if (!streaming && input.length % size !== 0) {
    throw new OperationError(`Without padding the input must be a multiple of ${size} bytes.`);
  }

  const out = new Uint8Array(input.length);
  let previous: Uint8Array = new Uint8Array(iv);

  for (let at = 0; at < input.length; at += size) {
    const block = input.subarray(at, at + size);
    switch (mode) {
      case 'ECB':
        out.set(cipher.encryptBlock(block), at);
        break;
      case 'CBC': {
        const mixed = new Uint8Array(block);
        xorInto(mixed, previous);
        previous = cipher.encryptBlock(mixed);
        out.set(previous, at);
        break;
      }
      case 'CFB': {
        const keystream = cipher.encryptBlock(previous);
        const chunk = new Uint8Array(block);
        for (let i = 0; i < chunk.length; i++) chunk[i] = (chunk[i] as number) ^ (keystream[i] as number);
        out.set(chunk, at);
        // The ciphertext of this block becomes the input to the next.
        const next = new Uint8Array(size);
        next.set(chunk.subarray(0, size));
        previous = next;
        break;
      }
      case 'OFB': {
        previous = cipher.encryptBlock(previous);
        const chunk = new Uint8Array(block);
        for (let i = 0; i < chunk.length; i++) chunk[i] = (chunk[i] as number) ^ (previous[i] as number);
        out.set(chunk, at);
        break;
      }
      case 'CTR': {
        const keystream = cipher.encryptBlock(previous);
        const chunk = new Uint8Array(block);
        for (let i = 0; i < chunk.length; i++) chunk[i] = (chunk[i] as number) ^ (keystream[i] as number);
        out.set(chunk, at);
        increment(previous);
        break;
      }
      default:
        throw new OperationError(`'${mode}' is not a mode this cipher offers.`);
    }
  }
  return out;
}

export function decryptBlocks(
  cipher: BlockCipher,
  data: Uint8Array,
  mode: string,
  iv: Uint8Array,
  padding: string,
): Uint8Array {
  const size = cipher.blockSize;
  checkIv(mode, iv, size);

  // CFB, OFB and CTR decrypt by generating the same keystream and XORing again,
  // so decryption there is literally the encryption path.
  if (mode === 'CFB') {
    const out = new Uint8Array(data.length);
    let previous: Uint8Array = new Uint8Array(iv);
    for (let at = 0; at < data.length; at += size) {
      const block = data.subarray(at, at + size);
      const keystream = cipher.encryptBlock(previous);
      const chunk = new Uint8Array(block);
      for (let i = 0; i < chunk.length; i++) chunk[i] = (chunk[i] as number) ^ (keystream[i] as number);
      out.set(chunk, at);
      const next = new Uint8Array(size);
      next.set(block.subarray(0, size));
      previous = next;
    }
    return out;
  }
  if (mode === 'OFB' || mode === 'CTR') return encryptBlocks(cipher, data, mode, iv, 'None');

  if (data.length % size !== 0) {
    throw new OperationError(`Ciphertext must be a multiple of ${size} bytes; this is ${data.length}.`);
  }

  const out = new Uint8Array(data.length);
  let previous: Uint8Array = new Uint8Array(iv);
  for (let at = 0; at < data.length; at += size) {
    const block = data.subarray(at, at + size);
    const plain = cipher.decryptBlock(block);
    if (mode === 'CBC') {
      xorInto(plain, previous);
      previous = new Uint8Array(block);
    } else if (mode !== 'ECB') {
      throw new OperationError(`'${mode}' is not a mode this cipher offers.`);
    }
    out.set(plain, at);
  }
  return padding === 'None' ? out : unpad(out, size);
}
