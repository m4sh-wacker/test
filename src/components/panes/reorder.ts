/**
 * Turning a pointer position into the index a dragged step should end up at.
 *
 * There are two different indices in play and confusing them is a real bug that
 * shipped: a *seam* is a gap between blocks, of which a list of n has n+1, and
 * a *final index* is the position the step occupies once it has been lifted out
 * of its old place, of which there are n. The old drop code handed a seam
 * straight to `reorderStep`, which reads a final index, so dragging a step
 * downwards consistently landed it one place further than the line said it
 * would.
 *
 * Keeping the arithmetic here, away from the DOM, is what makes it testable.
 */

/** Vertical extent of one block, as `getBoundingClientRect` gives it. */
export type Span = { top: number; height: number };

/**
 * Which gap the pointer is in: past the middle of a block, you are below it.
 *
 * Returns 0..spans.length, where `spans.length` means "after everything".
 */
export function seamAt(y: number, spans: readonly Span[]): number {
  for (let i = 0; i < spans.length; i += 1) {
    const span = spans[i];
    if (!span) continue;
    if (y < span.top + span.height / 2) return i;
  }
  return spans.length;
}

/**
 * The seam a step is being dropped into, as the index it will occupy.
 *
 * Dropping into a seam below where the step started closes up by one, because
 * the step is no longer sitting above that seam once it has been lifted out.
 */
export function finalIndex(seam: number, from: number): number {
  return seam > from ? seam - 1 : seam;
}

/** Where a step dragged to `y` should land, given where it started. */
export function dropTarget(y: number, spans: readonly Span[], from: number): number {
  return finalIndex(seamAt(y, spans), from);
}
