import type { Layer, RecipeStep, Terminus, TerminusReason } from '../types';
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
  depth: 'The depth limit was reached, so there may be another layer below this.',
  budget: 'The time budget ran out, so there may be another layer below this.',
  cycle: 'Decoding started repeating itself, so it was stopped here.',
  failed: 'The next layer looked decodable but the decode failed, so it stops here.',
};

function ending(reason: PlainReason): Terminus {
  return { reason, note: NOTES[reason], complete: reason === 'plain' };
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
    return note ? { reason: 'remainder', note, complete: true } : ending('plain');
  }

  const best = found.matches[0]!;
  return {
    reason: 'identified',
    complete: true,
    note: found.oneWay
      ? `This is ${best.name}, which is one-way. There is nothing left to decode.`
      : `This is ${best.name}. It does not decode into anything further.`,
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
    const best = candidates[0];
    if (!best || best.confidence < opts.threshold) {
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

export { toChain, describeChain, chainPreview } from './chain';
