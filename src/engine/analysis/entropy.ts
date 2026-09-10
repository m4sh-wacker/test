import { shannonEntropy } from '../core/bytes';

/**
 * The shape of a payload, measured rather than guessed.
 *
 * Entropy is the one property that separates compressed or encrypted bytes from
 * everything else without decoding anything: English prose sits near 4 bits per
 * byte, Base64 near 6, and anything compressed or encrypted crowds up against
 * 8. Reading it in blocks rather than over the whole input is what makes it
 * useful — a 40 KB log file with a 2 KB encrypted blob buried in it has an
 * unremarkable average and a very obvious spike.
 *
 * This is the view no amount of decoding gives you, because it is about the
 * bytes you already have.
 */

export interface EntropyBucket {
  /** Byte offset where this block starts, inclusive. */
  start: number;
  /** Byte offset where it ends, exclusive. */
  end: number;
  /** Shannon entropy in bits per byte, 0 to 8. */
  entropy: number;
}

/** What a level of entropy usually means, in the order they are checked. */
export type EntropyBand = 'sparse' | 'text' | 'encoded' | 'dense';

/**
 * Thresholds, in bits per byte.
 *
 * Deliberately "consistent with" rather than "is". Entropy is evidence about a
 * block, not a verdict on it: a short block of unlucky text can reach 7, and a
 * badly compressed one can sit at 6. The bands point somewhere worth looking;
 * they do not answer the question.
 */
export function bandOf(entropy: number): EntropyBand {
  if (entropy >= 7.0) return 'dense';
  if (entropy >= 5.2) return 'encoded';
  if (entropy >= 2.5) return 'text';
  return 'sparse';
}

/** The most input this measures, so a large file cannot stall the interface. */
const MAX_SAMPLE = 1024 * 1024;

/**
 * The smallest block worth measuring, and the reason this is not a free choice.
 *
 * Shannon entropy over n bytes cannot exceed log2(n), because n samples can
 * hold at most n distinct values. A 22-byte block therefore tops out at 4.46
 * bits however random it is — which is the entropy of English prose, so a
 * profile drawn in blocks that size classifies encrypted data as text and
 * cannot ever report 'dense'. It looks like a graph and means nothing.
 *
 * 256 bytes puts the ceiling at 8 and lands uniformly random data around 7.2,
 * which is above the threshold with room to spare.
 */
const MIN_BLOCK = 256;

/**
 * Below this there is no profile, only an average.
 *
 * Eight blocks at the minimum size. Fewer than that and the picture is too
 * coarse to show a discontinuity, which is the only thing it is for.
 */
export const MIN_FOR_PROFILE = MIN_BLOCK * 8;

export function entropyProfile(bytes: Uint8Array, buckets = 64): EntropyBucket[] {
  const length = Math.min(bytes.length, MAX_SAMPLE);
  if (length < MIN_FOR_PROFILE) return [];

  const size = Math.max(MIN_BLOCK, Math.ceil(length / buckets));
  const profile: EntropyBucket[] = [];

  for (let start = 0; start < length; start += size) {
    const end = Math.min(start + size, length);
    profile.push({ start, end, entropy: shannonEntropy(bytes.subarray(start, end)) });
  }

  return profile;
}

/**
 * The blocks that stand out from their neighbours.
 *
 * A uniformly high-entropy payload is just an encrypted file, and the profile
 * already says so at a glance. What is worth pointing at is the
 * *discontinuity* — the run of dense bytes inside otherwise ordinary content,
 * which is where something has been hidden rather than merely stored.
 *
 * The first version of this used `mean + 1.5 * standard deviation`, which is
 * the reflex and is wrong here. A payload of prose, padding and one encrypted
 * blob is trimodal: the padding drags the mean down, the spread of a
 * three-humped distribution is enormous, and the threshold came out at 8.3 —
 * above the maximum entropy a byte can carry, so nothing ever qualified. The
 * rule below says what the paragraph above says, which is the better test of
 * whether it is the right rule.
 */
export function standoutRegions(profile: EntropyBucket[]): EntropyBucket[] {
  if (profile.length < 4) return [];

  const dense = profile.filter((bucket) => bandOf(bucket.entropy) === 'dense');
  if (dense.length === 0) return [];

  // Mostly dense means the payload *is* dense. Singling out part of it would
  // send somebody to an arbitrary offset for no reason.
  if (dense.length / profile.length > 0.6) return [];

  const regions: EntropyBucket[] = [];
  for (const bucket of dense) {
    const last = regions[regions.length - 1];
    // Adjacent blocks are one region, not several.
    if (last && last.end === bucket.start) last.end = bucket.end;
    else regions.push({ ...bucket });
  }

  return regions;
}
