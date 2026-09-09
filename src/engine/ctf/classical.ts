/**
 * Recovering classical-cipher keys by measurement rather than by guessing.
 *
 * This is the part of a CTF that a person does with a pencil and a frequency
 * table, and it is entirely mechanical: the index of coincidence says whether
 * one alphabet was used or several, the same statistic over every n-th letter
 * says how many, and a chi-squared fit per column says which. Nothing here is
 * a heuristic dressed up as an answer — every number it reports is a
 * measurement the analyst can check.
 *
 * The numbers themselves: English text has an index of coincidence near 0.067,
 * because letters are unevenly distributed and two letters drawn at random from
 * English agree far more often than chance. A uniformly random string sits at
 * 1/26 ≈ 0.0385. A monoalphabetic substitution — Caesar, Atbash, any letter
 * swap — permutes the alphabet without flattening it, so it keeps English's
 * 0.067. A polyalphabetic cipher spreads each plaintext letter across several
 * ciphertext letters and pushes the value down towards 0.0385. That gap is the
 * whole diagnostic.
 */

/** English letter frequencies, as proportions of the letters only. */
const ENGLISH = [
  0.08167, 0.01492, 0.02782, 0.04253, 0.12702, 0.02228, 0.02015, 0.06094, 0.06966, 0.00153,
  0.00772, 0.04025, 0.02406, 0.06749, 0.07507, 0.01929, 0.00095, 0.05987, 0.06327, 0.09056,
  0.02758, 0.00978, 0.02360, 0.0015, 0.01974, 0.00074,
] as const;

export const ENGLISH_IC = 0.0667;
export const RANDOM_IC = 1 / 26;

/** The letters only, upper-cased, as 0..25. Everything else is discarded. */
export function letters(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 65 && code <= 90) out[n++] = code - 65;
    else if (code >= 97 && code <= 122) out[n++] = code - 97;
  }
  return out.subarray(0, n);
}

/**
 * Index of coincidence: the chance that two letters drawn from the text agree.
 *
 * Needs a reasonable amount of text. Below about forty letters the statistic is
 * dominated by noise and says nothing, which is why callers check the length
 * before trusting it.
 */
export function indexOfCoincidence(values: Uint8Array): number {
  if (values.length < 2) return 0;
  const counts = new Array<number>(26).fill(0);
  for (const value of values) counts[value]! += 1;

  let sum = 0;
  for (const count of counts) sum += count * (count - 1);
  return sum / (values.length * (values.length - 1));
}

/** How well a shifted column matches English. Lower is better. */
function chiSquared(counts: number[], total: number, shift: number): number {
  let score = 0;
  for (let i = 0; i < 26; i++) {
    const expected = total * ENGLISH[(i + shift) % 26]!;
    const difference = counts[i]! - expected;
    score += expected === 0 ? 0 : (difference * difference) / expected;
  }
  return score;
}

/**
 * The rotation that turns this column into English, and how well it fits.
 *
 * The returned shift is the *decoding* one — add it to get plaintext. The key
 * letter that produced the column is its inverse, `(26 - shift) % 26`, and
 * conflating the two is the classic way to get a plausible-looking wrong key.
 */
function bestShift(values: Uint8Array): { shift: number; score: number } {
  const counts = new Array<number>(26).fill(0);
  for (const value of values) counts[value]! += 1;

  let shift = 0;
  let score = Infinity;
  for (let candidate = 0; candidate < 26; candidate++) {
    const fit = chiSquared(counts, values.length, candidate);
    if (fit < score) {
      score = fit;
      shift = candidate;
    }
  }
  return { shift, score };
}

/**
 * Characters a classical cipher over English never produces.
 *
 * Digits and the Base64 and hex punctuation. Braces, underscores and ordinary
 * sentence punctuation are deliberately absent from this set: a flag looks like
 * `CTF{a_b_c}` and enciphered prose keeps its full stops, and neither is a
 * reason to stop measuring.
 */
const NOT_CLASSICAL = new Set('0123456789+/=@#$%^&*|<>~`\\');

/** Above this share of such characters, the text is an encoding, not a cipher. */
const FOREIGN_LIMIT = 0.01;

/**
 * Whether the text is letters-and-punctuation of the kind these ciphers act on.
 *
 * The digit rule is the one that matters, and it was learned the hard way. A
 * Vigenère cipher moves letters and leaves everything else alone, so its output
 * has exactly as many digits as its input: for English prose, none. Base64 of
 * that same prose is also mostly letters — and if you let it through, the key
 * recovery below dutifully finds a ten-letter "key" whose columns score 0.0647,
 * squarely inside the range a genuine key produces. No threshold further down
 * can separate the two, because by then the damage is done. It has to be
 * refused here, on the one thing that really does tell them apart.
 */
export function isAlphabetic(text: string): boolean {
  const sample = text.slice(0, 4096);
  if (sample.length === 0) return false;

  let alpha = 0;
  let other = 0;
  let foreign = 0;
  for (let i = 0; i < sample.length; i++) {
    const char = sample[i]!;
    const code = sample.charCodeAt(i);
    if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) alpha++;
    else if (code !== 32 && code !== 10 && code !== 13 && code !== 9) {
      other++;
      if (NOT_CLASSICAL.has(char)) foreign++;
    }
  }

  if (foreign / sample.length > FOREIGN_LIMIT) return false;
  return alpha >= 40 && alpha > other * 3;
}

export interface CaesarGuess {
  /** The rotation that decodes: feed it straight to ROT. */
  shift: number;
  ic: number;
  /** Chi-squared fit of the recovered plaintext. Under ~50 is a good fit. */
  fit: number;
}

/**
 * The Caesar shift, when the text is monoalphabetic.
 *
 * Returns null when the index of coincidence says the text is not a simple
 * substitution at all, because a shift recovered from polyalphabetic text is
 * meaningless and reporting it would be worse than reporting nothing.
 */
export function caesarShift(text: string): CaesarGuess | null {
  if (!isAlphabetic(text)) return null;
  const values = letters(text);
  if (values.length < 40) return null;

  const ic = indexOfCoincidence(values);
  if (ic < 0.055) return null;

  const { shift, score } = bestShift(values);
  // Zero means the text already fits English, so there is nothing to undo.
  if (shift === 0) return null;
  return { shift, ic, fit: score / values.length };
}

export interface VigenereGuess {
  key: string;
  keyLength: number;
  /** Index of coincidence of the whole text — low is what led here. */
  ic: number;
  /** Average index of coincidence of the columns at this key length. */
  columnIc: number;
}

const MAX_KEY_LENGTH = 16;

/**
 * The Vigenère key, recovered the way it is recovered by hand.
 *
 * Step one: for every candidate key length, split the text into that many
 * columns and average their indices of coincidence. The right length is the one
 * where each column is a Caesar shift of English, so its columns score near
 * 0.067 while every wrong length scores near 0.0385.
 *
 * Step two: solve each column as a Caesar independently, by chi-squared fit.
 *
 * Returns null when nothing separates itself, rather than returning the least
 * bad of a set of equally poor answers.
 */
export function vigenereKey(text: string): VigenereGuess | null {
  if (!isAlphabetic(text)) return null;
  const values = letters(text);
  // Each column needs enough letters for its own statistic to mean anything,
  // and the longest key we try divides the text sixteen ways.
  if (values.length < 100) return null;

  const ic = indexOfCoincidence(values);
  if (ic > 0.058) return null;

  let bestLength = 0;
  let bestColumnIc = 0;

  for (let length = 2; length <= MAX_KEY_LENGTH; length++) {
    if (values.length / length < 20) break;

    let total = 0;
    for (let offset = 0; offset < length; offset++) {
      const column = new Uint8Array(Math.ceil((values.length - offset) / length));
      let n = 0;
      for (let i = offset; i < values.length; i += length) column[n++] = values[i]!;
      total += indexOfCoincidence(column.subarray(0, n));
    }

    const average = total / length;
    // A multiple of the real key length scores just as well as the length
    // itself, so a later length has to beat the incumbent clearly to take it.
    if (average > bestColumnIc + 0.005) {
      bestColumnIc = average;
      bestLength = length;
    }
  }

  // Halfway between random and English is the least this can be and still mean
  // the columns are monoalphabetic.
  if (bestLength === 0 || bestColumnIc < 0.055) return null;

  let key = '';
  for (let offset = 0; offset < bestLength; offset++) {
    const column = new Uint8Array(Math.ceil((values.length - offset) / bestLength));
    let n = 0;
    for (let i = offset; i < values.length; i += bestLength) column[n++] = values[i]!;
    // bestShift gives the rotation that decodes the column; the key letter is
    // its inverse, since the key is what was added in the first place.
    key += String.fromCharCode(65 + ((26 - bestShift(column.subarray(0, n)).shift) % 26));
  }

  return { key, keyLength: bestLength, ic, columnIc: bestColumnIc };
}
