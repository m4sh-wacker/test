import type { Operation } from './types';

/**
 * A late-bound way to reach the registry from inside it.
 *
 * `Generate all hashes` needs the registry, and so does detection — but the
 * registry is built by importing every operation module, so importing it back
 * would be a cycle. Instead the registry hands its own contents over once they
 * exist, and callers ask for them at run time, by which point they always do.
 *
 * This is a leaf module on purpose: it imports nothing but a type, so anything
 * can depend on it without joining the cycle it exists to break.
 */
let lookup: ((id: string) => Operation | undefined) | null = null;
let detectable: Operation[] | null = null;

export function provideRegistry(
  fn: (id: string) => Operation | undefined,
  operations: Operation[],
): void {
  lookup = fn;
  detectable = operations;
}

export function getOperation(id: string): Operation | undefined {
  return lookup?.(id);
}

/**
 * The operations detection is allowed to try, most specific first.
 *
 * Throws rather than returning an empty list if the registry has not loaded.
 * Silently detecting nothing would look exactly like an input nothing matches,
 * and that is the worst possible way for a wiring mistake to present itself.
 */
export function detectableOperations(): Operation[] {
  if (!detectable) {
    throw new Error('The operation registry has not been loaded, so detection cannot run.');
  }
  return detectable;
}
