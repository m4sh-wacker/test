import type { RecipeStep } from '../types';

/**
 * The analysis contract.
 *
 * Decoding answers "how do I read this". Analysis answers the question an
 * incident responder actually has: "what is in this, and which part of it
 * should worry me". Those are different enough to deserve their own shapes.
 */

export type IndicatorKind =
  | 'url'
  | 'domain'
  | 'ipv4'
  | 'ipv6'
  | 'email'
  | 'hash'
  | 'path'
  | 'registry'
  | 'command'
  | 'crypto-key'
  | 'mac'
  | 'cve'
  | 'wallet';

export interface Indicator {
  kind: IndicatorKind;
  value: string;
  /** Safe to paste into a ticket without anyone clicking it by accident. */
  defanged: string;
  /** How deep in the decode tree it was found. */
  depth: number;
  /** The decode path that revealed it, e.g. "Base64 → gzip → JSON". */
  path: string;
}

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  /** What it means and why it matters, in a sentence an analyst can act on. */
  detail: string;
  /** The literal text that triggered it, trimmed. */
  evidence: string;
  depth: number;
  path: string;
  /** A CWE or OWASP identifier, where one applies. */
  reference?: string;
}

export interface AnalysisNode {
  id: string;
  /** 'Base64', 'gzip', 'JSON'… or 'Input' for the root. */
  format: string;
  confidence: number;
  depth: number;
  path: string;
  byteLength: number;
  output: string;
  preview: string;
  /** The recipe that reaches this node from the original input. */
  steps: RecipeStep[];
  children: AnalysisNode[];
  /**
   * Set when this branch came from an encoded region *inside* the parent
   * rather than from decoding the parent whole — a Base64 blob in a JSON
   * field, a hex string in a log line.
   */
  origin?: { label: string; offset: number };
}

export interface Analysis {
  root: AnalysisNode;
  /** Total nodes explored, including the root. */
  nodes: number;
  maxDepth: number;
  indicators: Indicator[];
  findings: Finding[];
  durationMs: number;
  /** True when a bound was hit and the tree is not exhaustive. */
  truncated: boolean;
}

export interface AnalyseOptions {
  maxDepth: number;
  maxNodes: number;
  budgetMs: number;
  /** Candidates below this are not followed. */
  threshold: number;
}

export const DEFAULT_ANALYSE_OPTIONS: AnalyseOptions = {
  maxDepth: 8,
  maxNodes: 64,
  budgetMs: 4000,
  threshold: 0.5,
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};
