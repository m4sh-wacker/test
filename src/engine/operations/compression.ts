import { OperationError } from '../types';
import { asBytes, bytesToLatin1 } from '../core/bytes';
import type { Operation } from './types';

/**
 * Compression uses the platform's own DecompressionStream rather than a bundled
 * library. One less dependency in the supply chain, and the browser's
 * implementation is the better-audited one.
 */
async function transform(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const source = new Blob([bytes as BlobPart]).stream();
  const piped = source.pipeThrough(stream as ReadableWritablePair<Uint8Array, Uint8Array>);
  const buffer = await new Response(piped).arrayBuffer();
  return new Uint8Array(buffer);
}

function asBinary(input: string): Uint8Array {
  // Compressed data reaching this point came from a previous decode step, where
  // it was carried one character per byte. Re-encoding it as UTF-8 would
  // corrupt every byte above 0x7F.
  return asBytes(input);
}

async function decompress(input: string, format: 'gzip' | 'deflate' | 'deflate-raw') {
  try {
    return bytesToLatin1(await transform(asBinary(input), new DecompressionStream(format)));
  } catch {
    throw new OperationError(`Input is not valid ${format} data.`);
  }
}

async function compress(input: string, format: 'gzip' | 'deflate' | 'deflate-raw') {
  return bytesToLatin1(await transform(asBytes(input), new CompressionStream(format)));
}

export const compressionOperations: Operation[] = [
  {
    id: 'gunzip',
    name: 'Gunzip',
    category: 'Compression',
    description: 'Decompresses gzip data.',
    aliases: ['gzip decompress', 'ungzip', 'inflate gzip'],
    args: [],
    run: (input) => decompress(input, 'gzip'),
    detection: {
      // The gzip header: magic 1f 8b, then deflate as the compression method.
      formatName: 'gzip',
      magic: '1f8b',
      minLength: 10,
    },
  },
  {
    id: 'gzip',
    name: 'Gzip',
    category: 'Compression',
    description: 'Compresses data using gzip.',
    aliases: ['gzip compress'],
    args: [],
    run: (input) => compress(input, 'gzip'),
  },
  {
    id: 'zlib-inflate',
    name: 'Zlib Inflate',
    category: 'Compression',
    description: 'Decompresses zlib-wrapped deflate data.',
    aliases: ['inflate', 'zlib decompress'],
    args: [],
    run: (input) => decompress(input, 'deflate'),
    detection: {
      formatName: 'zlib',
      magic: '789c',
      minLength: 8,
    },
  },
  {
    id: 'zlib-deflate',
    name: 'Zlib Deflate',
    category: 'Compression',
    description: 'Compresses data using zlib-wrapped deflate.',
    aliases: ['deflate', 'zlib compress'],
    args: [],
    run: (input) => compress(input, 'deflate'),
  },
  {
    id: 'raw-inflate',
    name: 'Raw Inflate',
    category: 'Compression',
    description: 'Decompresses raw deflate data that has no zlib or gzip header.',
    aliases: ['inflate raw', 'deflate decompress'],
    args: [],
    run: (input) => decompress(input, 'deflate-raw'),
  },
  {
    id: 'raw-deflate',
    name: 'Raw Deflate',
    category: 'Compression',
    description: 'Compresses data using deflate with no header.',
    aliases: ['deflate raw'],
    args: [],
    run: (input) => compress(input, 'deflate-raw'),
  },
];
