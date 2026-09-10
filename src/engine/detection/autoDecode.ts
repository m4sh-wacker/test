import type { Candidate, Layer, RecipeStep, Terminus, TerminusReason } from '../types';
import { getOperation } from '../operations';
import { byteLength } from '../core/bytes';
import { detect } from './detect';
import { terminalIdentification } from './identify';

export interface AutoDecodeOptions {
  maxDepth: number;
  /** Candidates below this confidence are not followed. */
  threshold: number;
  /** Total wall-clock budget. An adversarial input must not run forever. */
  budgetMs: number;
}

export const DEFAULT_OPTIONS: AutoDecodeOptions = {
  maxDepth: 6,
  threshold: 0.55,
  budgetMs: 2500,
};

/**
 * The notes each ending carries.
 *
 * Written out rather than assembled from fragments, because these are the
 * sentences an analyst reads when they are deciding whether to trust the chain.
 * The distinction they encode is the one that matters: 'plain' and 'identified'
 * mean the engine finished, everything else means it stopped early and there
 * may be another layer underneath.
 */
type PlainReason = Exclude<TerminusReason, 'identified' | 'remainder'>;

const NOTES: Record<PlainReason, string> = {
  plain: 'Nothing below this decodes any further — this is the content itself.',
  tooShort:
    'Too short to judge. A few characters can be read as almost any encoding, so this may still ' +
    'be wrapped in something — there is just no evidence either way.',
  depth: 'The depth limit was reached, so there may be another layer below this.',
  budget: 'The time budget ran out, so there may be another layer below this.',
  cycle: 'Decoding started repeating itself, so it was stopped here.',
  failed: 'The next layer looked decodable but the decode failed, so it stops here.',
};

function ending(reason: PlainReason): Terminus {
  return { reason, note: NOTES[reason], complete: reason === 'plain' };
}

/**
 * The shortest input any encoding here declares itself willing to be detected
 * in. Below it, every detector has already declined on length alone.
 */
const SHORTEST_DETECTABLE = 8;

/**
 * Whether the value is only undecoded because it is too small to judge.
 *
 * Nesting shrinks each layer, so a chain that goes deep ends on something tiny
 * by construction — and a handful of characters is a valid reading of almost
 * any encoding. `abcd` is Base64, and it is also just four letters. There is no
 * evidence either way, which is a different answer from "this is the content",
 * and saying the second when you mean the first is the kind of confident wrong
 * answer this engine is supposed to avoid.
 *
 * This is a floor, not the last word. `continuation` below gets past it when
 * the chain above supplies the evidence the value itself cannot.
 */
function tooShortToJudge(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length < SHORTEST_DETECTABLE;
}

/**
 * Whether a value is clean enough to be believed on nothing but its own shape.
 *
 * Printable ASCII and ordinary whitespace. Deliberately strict: this is the
 * only guard standing between a short decode and a confident wrong answer.
 */
function looksLikeText(value: string): boolean {
  if (value.length === 0) return false;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    const printable = code >= 0x20 && code <= 0x7e;
    const whitespace = code === 0x09 || code === 0x0a || code === 0x0d;
    if (!printable && !whitespace) return false;
  }
  return true;
}

/**
 * One more attempt with the operation that produced this value.
 *
 * Below SHORTEST_DETECTABLE every detector declines on length alone, and for a
 * value with no history that is exactly right: four characters really are a
 * valid reading of almost anything. But a value that got here by being decoded
 * four times is not a value with no history, and throwing that away is how
 * `bW1k` — the fifth Base64 layer of a five-layer chain — came to be reported
 * as the end of the line while `mmd` sat underneath it.
 *
 * So try the same operation once more and keep the result only if it is clean
 * text. Three arbitrary bytes are printable about five percent of the time, so
 * a chain of Base64 that decodes to `mmd` is evidence and a chain that decodes
 * to two control characters is not. That gap is the whole justification, and it
 * is the only thing allowed to override the floor: with no previous operation
 * to repeat, a short value is still left alone.
 *
 * The operation runs twice on success — once here to see, once in the loop to
 * keep. At this length that costs nothing, and it keeps one path through the
 * loop instead of two.
 */
async function continuation(
  value: string,
  lastStep: RecipeStep | undefined,
  format: string,
  seen: ReadonlySet<string>,
  depth: number,
): Promise<Candidate | undefined> {
  if (!lastStep || !tooShortToJudge(value)) return undefined;

  const operation = getOperation(lastStep.opId);
  if (!operation) return undefined;

  let output: string;
  try {
    output = await Promise.resolve(operation.run(value, lastStep.args));
  } catch {
    return undefined;
  }

  if (output === value || seen.has(output) || !looksLikeText(output)) return undefined;

  return {
    id: `continued-${depth}`,
    format,
    // Modest on purpose, and below what this value would have needed to get
    // here on its own merits. The chain above is what justifies this layer.
    confidence: 0.5,
    evidence: [
      {
        label: `continues ${format}`,
        detail:
          `Too short for any detector to judge alone, but every layer above it is ${format} and ` +
          `decoding it once more gives clean text. The chain is the evidence, not the value.`,
        weight: 0.5,
      },
    ],
    preview: output.slice(0, 120),
    steps: [{ ...lastStep, uid: `${lastStep.opId}-continued-${depth}` }],
  };
}

/**
 * Decides how a finished chain ends: named, plain, or plain-with-a-caveat.
 *
 * Identification is asked here and nowhere else — *after* decoding has run out
 * of candidates. Asking first would be wrong: a run of hex digits is both
 * digest-shaped and, often, hex-encoded text, and the decode is the better
 * answer whenever it produces one.
 *
 * `lastStep` is the operation that produced this value, and it gets the last
 * word. A JWT's payload is plain JSON by every measure the detector has, and
 * calling it 'the content itself' would quietly drop the fact that a signature
 * is sitting there unverified.
 */
function settle(value: string, lastStep: RecipeStep | undefined): Terminus {
  const found = terminalIdentification(value);
  if (!found) {
    const note = lastStep ? getOperation(lastStep.opId)?.detection?.terminalNote : undefined;
    if (note) return { reason: 'remainder', note, complete: true };
    // Checked after identification: a UUID is short too, and being able to name
    // it is a real answer where being unable to judge four characters is not.
    return ending(tooShortToJudge(value) ? 'tooShort' : 'plain');
  }

  const best = found.matches[0]!;
  return {
    reason: 'identified',
    complete: true,
    // 'Identified as' rather than 'This is a', because the names run from 'MD5'
    // to 'PNG image' to 'UUID' and no article fits all of them — 'a MP3 audio'
    // and 'This is PNG image' are each wrong in their own way.
    note: found.oneWay
      ? `This is ${best.name}, which is one-way. There is nothing left to decode.`
      : `Identified as ${best.name}. It does not decode into anything further.`,
    identification: found,
  };
}

/**
 * Peels encoding layers by decoding the best candidate and re-detecting on the
 * result, until nothing convincing is left — then says why it stopped.
 *
 * The stopping condition is as much of the answer as the layers are. A chain
 * that ends on a SHA-256 and a chain that ends because the clock ran out look
 * identical if all you show is the layers, and they mean opposite things: one
 * is finished, the other is a partial result the analyst should keep pulling
 * at. Every ending is therefore recorded on the last layer.
 *
 * Bounded on depth, wall-clock time, and repeats. Without those bounds a
 * crafted input could nest encodings indefinitely, or two operations could
 * decode into each other and loop.
 */
export async function autoDecode(
  input: string,
  options: Partial<AutoDecodeOptions> = {},
): Promise<Layer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const deadline = performance.now() + opts.budgetMs;

  const root: Layer = {
    id: 'input',
    depth: 0,
    format: 'Input',
    confidence: 1,
    byteLength: byteLength(input),
    output: input,
    evidence: [],
    steps: [],
    children: [],
  };

  let node = root;
  let current = input;
  const chain: RecipeStep[] = [];
  const seen = new Set<string>([current]);

  for (let depth = 1; depth <= opts.maxDepth; depth++) {
    if (current.trim().length === 0) {
      node.terminus = ending('plain');
      return root;
    }
    if (performance.now() > deadline) {
      node.terminus = ending('budget');
      return root;
    }

    const candidates = await detect(current);
    const detected = candidates[0];
    const best =
      detected && detected.confidence >= opts.threshold
        ? detected
        : await continuation(current, chain[chain.length - 1], node.format, seen, depth);
    if (!best) {
      node.terminus = settle(current, chain[chain.length - 1]);
      return root;
    }

    const step = best.steps[0];
    const operation = step ? getOperation(step.opId) : undefined;
    if (!step || !operation) {
      node.terminus = ending('failed');
      return root;
    }

    let output: string;
    try {
      output = await Promise.resolve(operation.run(current, step.args));
    } catch {
      node.terminus = ending('failed');
      return root;
    }

    // A decode that returns something already seen means we are going in
    // circles. Stop rather than build an infinite chain.
    if (seen.has(output)) {
      node.terminus = ending('cycle');
      return root;
    }
    seen.add(output);

    chain.push(step);

    const child: Layer = {
      id: `${best.id}-${depth}`,
      depth,
      format: best.format,
      confidence: best.confidence,
      byteLength: byteLength(output),
      output,
      evidence: best.evidence,
      steps: chain.map((s) => ({ ...s })),
      children: [],
    };

    node.children.push(child);
    node = child;
    current = output;
  }

  node.terminus = ending('depth');
  return root;
}

export {
  toChain,
  describeChain,
  chainPreview,
  summariseChain,
  describeRuns,
  chainConfidence,
} from './chain';
