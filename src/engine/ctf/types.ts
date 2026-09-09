import type { RecipeStep } from '../types';

/**
 * What kind of move a hint is.
 *
 * The order here is the order they rank in when confidence ties, because it is
 * the order a person would want them: a flag that has actually been found beats
 * a decode the engine is sure of, which beats a key it recovered by search,
 * which beats a guess from the alphabet, which beats advice.
 */
export type HintKind = 'flag' | 'decode' | 'crack' | 'shape' | 'identify' | 'inspect';

export const KIND_ORDER: Record<HintKind, number> = {
  flag: 0,
  decode: 1,
  crack: 2,
  shape: 3,
  identify: 4,
  inspect: 5,
};

export interface Hint {
  id: string;
  kind: HintKind;
  /** The move, written as an instruction: 'Decode as Base32'. */
  title: string;
  /** The measurement or observation that suggests it. Always present. */
  reason: string;
  /** 0..1. Never 1: a hint is a suggestion, not a result. */
  confidence: number;
  /** Which layer of the decode chain it applies to. 0 is the input as typed. */
  depth: number;
  /** How that layer was reached, e.g. 'Base64 → gzip'. Empty at depth 0. */
  path: string;
  /** What the move produces, when the engine actually ran it. */
  preview: string;
  /**
   * The recipe that carries the move out, from the *original* input — so
   * clicking a hint found four layers down produces a recipe that works.
   * Empty when the hint is advice rather than an action.
   */
  steps: RecipeStep[];
}

export interface FoundFlag {
  /** The flag exactly as it appears. */
  text: string;
  depth: number;
  path: string;
  /** True when the prefix is one of the well-known CTF formats. */
  known: boolean;
}

export interface CtfReport {
  flags: FoundFlag[];
  hints: Hint[];
  /** Layers searched, including the input itself. */
  layers: number;
  /** True when a bound was hit, so the search is not exhaustive. */
  truncated: boolean;
  durationMs: number;
}

export interface CtfOptions {
  /**
   * The flag prefix this competition uses, e.g. 'picoCTF'. Most CTFs announce
   * one, and knowing it turns a fuzzy search into an exact one.
   */
  format: string;
  /** How deep to follow the decode chain. */
  maxDepth: number;
  /** Total wall-clock budget for the whole search. */
  budgetMs: number;
}

export const DEFAULT_CTF_OPTIONS: CtfOptions = {
  format: '',
  maxDepth: 6,
  budgetMs: 4000,
};
