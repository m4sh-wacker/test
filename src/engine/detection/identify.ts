import type { HashIdentification, HashMatch } from '../types';
import { asBytes } from '../core/bytes';
import { matchSignature } from '../core/signatures';
import { identifyHash } from './hashes';
import { identifyArtefact, isTerminal } from './artefacts';

/**
 * What the bytes are, when they are a file.
 *
 * The most common thing anyone drops into this tool is a file, and until this
 * existed the answer was "Plain text" — while an operation elsewhere in the
 * catalogue could name fifty formats from their first bytes. A magic number is
 * about as close to proof as identification gets, so it is scored accordingly.
 */
function identifyFile(input: string): HashMatch | null {
  const bytes = asBytes(input);
  if (bytes.length < 4) return null;

  const signature = matchSignature(bytes);
  if (!signature) return null;

  const spaced = signature.magic.toUpperCase().replace(/(..)/g, '$1 ').trim();
  return {
    name: signature.description,
    confidence: 0.97,
    reason: `The file signature ${spaced}${signature.offset ? ` at offset ${signature.offset}` : ''}`,
    context: `A .${signature.extension} file, identified by its bytes rather than by a name.`,
  };
}

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
  const file = identifyFile(input);
  if (!hash && artefacts.length === 0 && !file) return null;

  const matches = [...(hash?.matches ?? []), ...artefacts, ...(file ? [file] : [])]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  const best = matches[0];
  return {
    matches,
    summary: file
      ? `${asBytes(input).length} bytes`
      : (hash?.summary ?? `${input.trim().length} characters`),
    oneWay: hash?.oneWay ?? false,
    // A file is where the chain ends: the bytes are the content, not a wrapper
    // around it. Anything that genuinely unwraps — gzip, a ZIP — is decoded
    // before identification is ever asked, because identification runs only
    // after decoding has run out of candidates.
    terminal:
      (hash?.oneWay ?? false) || best === file || (best ? isTerminal(best.name) : false),
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

  if (!found.terminal) return null;
  if (found.oneWay) return best.confidence >= ONE_WAY_FLOOR ? found : null;
  return best.confidence >= ARTEFACT_FLOOR ? found : null;
}
