import type { Severity } from '../../engine';

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

/**
 * Most severe first, because that is the order anyone reads findings in.
 *
 * Lives here rather than beside the card that renders them: a module that
 * exports both components and plain functions loses fast refresh.
 */
const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export function bySeverity(a: { severity: Severity }, b: { severity: Severity }): number {
  return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
}
