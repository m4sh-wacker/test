/** Joins class names, dropping anything falsy. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Confidence drives colour everywhere in the app, so the thresholds live in one
 * place. Low confidence is grey rather than red — a weak guess is not an error.
 */
export function confidenceColor(confidence: number): string {
  if (confidence >= 0.9) return 'var(--green)';
  if (confidence >= 0.6) return 'var(--amber)';
  return 'var(--text-faint)';
}
