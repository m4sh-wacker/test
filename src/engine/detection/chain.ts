import type { Layer, Terminus } from '../types';
import { previewText } from '../core/bytes';

/**
 * Reading a finished layer tree.
 *
 * Separate from the auto-decoder because these are pure functions of a `Layer`
 * and the interface uses them constantly, while the decoder itself pulls in the
 * whole operation registry. Keeping them apart is what lets the shell render a
 * chain without loading the engine.
 */

/** Flattens the tree into the single path the UI renders as a chain. */
export function toChain(root: Layer): Layer[] {
  const chain: Layer[] = [root];
  let node = root;
  while (node.children.length > 0) {
    const next = node.children[0]!;
    chain.push(next);
    node = next;
  }
  return chain;
}

/** The last layer, which is the one carrying the ending. */
export function lastLayer(root: Layer): Layer {
  const chain = toChain(root);
  return chain[chain.length - 1]!;
}

export function terminusOf(root: Layer): Terminus | null {
  return lastLayer(root).terminus ?? null;
}

/** The name the chain ends on, when it ends on a name rather than on content. */
export function terminusName(root: Layer): string | null {
  return terminusOf(root)?.identification?.matches[0]?.name ?? null;
}

/**
 * The chain as one line: 'Base64 → Gzip → SHA-256'.
 *
 * The identified ending is part of the description rather than a footnote,
 * because it is usually the answer the person was after. A chain that stopped
 * early instead ends in an ellipsis, so a partial result never reads as a
 * complete one.
 */
export function describeChain(root: Layer): string {
  const decoded = toChain(root).slice(1);
  const terminus = terminusOf(root);
  const named = terminus?.identification?.matches[0]?.name;

  const parts = decoded.map((layer) => layer.format);
  if (named) parts.push(named);

  if (parts.length === 0) return named ?? 'Plain text';
  return parts.join(' → ') + (terminus && !terminus.complete ? ' → …' : '');
}

export function chainPreview(root: Layer): string {
  return previewText(lastLayer(root).output);
}
