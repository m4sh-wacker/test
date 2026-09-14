import type { RecipeStep } from '../types';

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
  title: string;
  reason: string;
  confidence: number;
  depth: number;
  path: string;
  preview: string;
  steps: RecipeStep[];
}

export interface FoundFlag {
  text: string;
  depth: number;
  path: string;
  known: boolean;
}

export interface CtfReport {
  flags: FoundFlag[];
  hints: Hint[];
  layers: number;
  truncated: boolean;
  durationMs: number;
}

export interface CtfOptions {
  format: string;
  maxDepth: number;
  budgetMs: number;
}

export const DEFAULT_CTF_OPTIONS: CtfOptions = {
  format: '',
  maxDepth: 6,
  budgetMs: 4000,
};
