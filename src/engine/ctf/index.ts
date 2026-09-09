/**
 * CTF mode.
 *
 * Detection answers "what is this?". CTF mode answers "what should I try?",
 * which is a different question with a different standard of proof: a hint only
 * has to be worth a click, and it comes with the measurement that suggested it
 * so the person can judge that for themselves.
 */
export { ctfHints } from './hints';
export { findFlags, mergeFlags } from './flags';
export {
  caesarShift,
  indexOfCoincidence,
  isAlphabetic,
  letters,
  vigenereKey,
  ENGLISH_IC,
  RANDOM_IC,
} from './classical';
export { alphabetHints } from './alphabets';
export { DEFAULT_CTF_OPTIONS, KIND_ORDER } from './types';
export type { CtfOptions, CtfReport, FoundFlag, Hint, HintKind } from './types';
