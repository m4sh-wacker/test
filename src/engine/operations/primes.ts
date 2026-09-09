import { OperationError } from '../types';
import { arg, type Operation } from './types';

/**
 * Prime generation and testing.
 *
 * Both rest on Miller-Rabin, which never says "prime" — it says "no witness
 * found in this many tries". For a random candidate of a few hundred bits, forty
 * rounds puts the chance of a composite slipping through below 2⁻⁸⁰, which is
 * far below the chance of a hardware fault, and that is what every library in
 * the world relies on. It is stated rather than hidden, because the difference
 * between "prime" and "probably prime" occasionally matters.
 */

/** The primes below 256, used to reject most composites before the hard work. */
const SMALL_PRIMES = (() => {
  const sieve = new Uint8Array(256).fill(1);
  const primes: bigint[] = [];
  for (let n = 2; n < 256; n++) {
    if (sieve[n] === 0) continue;
    primes.push(BigInt(n));
    for (let m = n * n; m < 256; m += n) sieve[m] = 0;
  }
  return primes;
})();

function power(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n;
  let b = base % modulus;
  let e = exponent;
  while (e > 0n) {
    if ((e & 1n) === 1n) result = (result * b) % modulus;
    b = (b * b) % modulus;
    e >>= 1n;
  }
  return result;
}

/** Miller-Rabin, with the given number of random witnesses. */
export function isProbablePrime(n: bigint, rounds: number): boolean {
  if (n < 2n) return false;
  for (const small of SMALL_PRIMES) {
    if (n === small) return true;
    if (n % small === 0n) return false;
  }

  let d = n - 1n;
  let s = 0n;
  while ((d & 1n) === 0n) {
    d >>= 1n;
    s += 1n;
  }

  for (let round = 0; round < rounds; round++) {
    const a = randomBelow(n - 3n) + 2n;
    let x = power(a, d, n);
    if (x === 1n || x === n - 1n) continue;

    let composite = true;
    for (let i = 1n; i < s; i++) {
      x = (x * x) % n;
      if (x === n - 1n) {
        composite = false;
        break;
      }
    }
    if (composite) return false;
  }
  return true;
}

/** A uniform random value in [0, limit), from the platform's generator. */
function randomBelow(limit: bigint): bigint {
  const bits = limit.toString(2).length;
  const bytes = Math.ceil(bits / 8);
  const buffer = new Uint8Array(bytes);

  for (;;) {
    globalThis.crypto.getRandomValues(buffer);
    let value = 0n;
    for (const byte of buffer) value = (value << 8n) | BigInt(byte);
    value >>= BigInt(bytes * 8 - bits);
    if (value < limit) return value;
  }
}

function randomOfBits(bits: number): bigint {
  const bytes = Math.ceil(bits / 8);
  const buffer = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(buffer);

  let value = 0n;
  for (const byte of buffer) value = (value << 8n) | BigInt(byte);
  value >>= BigInt(bytes * 8 - bits);

  // The top bit fixes the size and the bottom bit makes it odd, which between
  // them remove the two ways a random draw wastes a search.
  value |= 1n << BigInt(bits - 1);
  value |= 1n;
  return value;
}

const OUTPUT_FORMATS = ['Decimal', 'Hex', 'Bytes'];

function format(value: bigint, how: string): string {
  if (how === 'Hex') {
    const hex = value.toString(16);
    return hex.length % 2 === 0 ? hex : `0${hex}`;
  }
  if (how === 'Bytes') {
    const hex = value.toString(16).padStart(Math.ceil(value.toString(16).length / 2) * 2, '0');
    let out = '';
    for (let i = 0; i < hex.length; i += 2) out += String.fromCharCode(Number.parseInt(hex.slice(i, i + 2), 16));
    return out;
  }
  return value.toString(10);
}

export const primeOperations: Operation[] = [
  {
    id: 'pseudo-random-prime-generator',
    name: 'Pseudo-Random Prime Generator',
    category: 'Encryption / Encoding',
    description: 'Generates a probable prime of a given size, tested with Miller-Rabin.',
    aliases: ['generate prime', 'random prime', 'miller-rabin'],
    budgetMs: 60000,
    args: [
      { name: 'Bits', type: 'number', value: 512, min: 8, max: 4096 },
      { name: 'Rounds', type: 'number', value: 40, min: 1, max: 200 },
      { name: 'Output', type: 'option', value: 'Decimal', options: OUTPUT_FORMATS },
    ],
    run: (_input, args) => {
      const bits = Math.min(4096, Math.max(8, Number(arg(args, 'Bits', 512))));
      const rounds = Math.min(200, Math.max(1, Number(arg(args, 'Rounds', 40))));

      // Bounded, because a search that cannot finish must say so rather than
      // hold the tab. By the prime number theorem an odd candidate of n bits is
      // prime about 2/(n ln 2) of the time, so this is many times what is needed.
      const attempts = Math.max(1000, bits * 40);
      for (let i = 0; i < attempts; i++) {
        const candidate = randomOfBits(bits);
        if (isProbablePrime(candidate, rounds)) {
          return format(candidate, String(arg(args, 'Output', 'Decimal')));
        }
      }
      throw new OperationError(`No prime found in ${attempts} tries, which should not happen.`);
    },
  },
  {
    id: 'primality-test',
    name: 'Primality test',
    category: 'Arithmetic / Logic',
    description: 'Says whether a number is prime, using Miller-Rabin for the large ones.',
    aliases: ['is prime', 'prime check', 'miller-rabin test'],
    budgetMs: 30000,
    args: [{ name: 'Rounds', type: 'number', value: 40, min: 1, max: 200 }],
    run: (input, args) => {
      const text = input.trim().replace(/[\s,_]/g, '');
      if (!/^\d+$/.test(text)) throw new OperationError('That is not a whole number in base ten.');

      const value = BigInt(text);
      const rounds = Math.min(200, Math.max(1, Number(arg(args, 'Rounds', 40))));
      const bits = value.toString(2).length;

      if (!isProbablePrime(value, rounds)) return `${text} is composite.`;
      if (value < 256n) return `${text} is prime.`;
      return `${text} is prime with probability at least 1 - 4^-${rounds} (${bits} bits).`;
    },
  },
];
