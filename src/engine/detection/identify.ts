import type { HashIdentification } from '../types';
import { identifyHash } from './hashes';
import { identifyArtefact, isTerminal } from './artefacts';

/**
 * Names what the input *is*, for the cases where that is the answer.
 *
 * Digests, keys, certificates, UUIDs, serialized objects, timestamps: none of
 * these decode into anything, and a tool that only decodes leaves the analyst
 * with nothing. Ranked and evidenced like every other claim the engine makes.
 *
 * It lives here rather than in the engine facade because auto-decoding needs
 * it: a chain that stops has to be able to say whether it finished or gave up,
 * and the difference is whether the value it stopped on has a name.
 */
export function identify(input: string): HashIdentification | null {
  const hash = identifyHash(input);
  const artefacts = identifyArtefact(input);
  if (!hash && artefacts.length === 0) return null;

  const matches = [...(hash?.matches ?? []), ...artefacts]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  const best = matches[0];
  return {
    matches,
    summary: hash?.summary ?? `${input.trim().length} characters`,
    oneWay: hash?.oneWay ?? (best ? isTerminal(best.name) : false),
  };
}

/** A one-way digest is only worth calling one when the shape really says so. */
const ONE_WAY_FLOOR = 0.6;
/** A terminal artefact — a UUID, a MAC, a card number — has to be near-certain. */
const ARTEFACT_FLOOR = 0.8;

/**
 * The identification, but only when it is strong enough to end a chain.
 *
 * This is asked *after* decoding has run out of candidates, never before. The
 * order matters: `48656c6c6f2c20776f726c642121212121` is thirty-four hex
 * digits, which is digest-shaped, but it also hex-decodes to English — and the
 * decode is the better answer. Identification is what you fall back on when
 * nothing decodes, not what you lead with.
 */
export function terminalIdentification(input: string): HashIdentification | null {
  const found = identify(input);
  const best = found?.matches[0];
  if (!found || !best) return null;

  if (found.oneWay && best.confidence >= ONE_WAY_FLOOR) return found;
  if (isTerminal(best.name) && best.confidence >= ARTEFACT_FLOOR) return found;
  return null;
}
