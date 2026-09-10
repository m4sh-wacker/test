/**
 * The contract between the interface and the analysis engine.
 *
 * Treat this as published: changing it is a coordinated change across both
 * halves of the project, never a local refactor.
 */

export type ArgType = 'string' | 'number' | 'boolean' | 'option' | 'toggleString' | 'textarea';

export interface OperationArg {
  name: string;
  type: ArgType;
  value: string | number | boolean;
  /** For `option`. */
  options?: string[];
  /**
   * Display names for `options`, keyed by value.
   *
   * `./0-9A-Za-z` is either UNIX crypt or a typo and the characters cannot tell
   * you which. The value stays the value — recipes and share links carry it
   * unchanged — and the label is what a person reads.
   */
  optionLabels?: Record<string, string>;
  /** For `toggleString`, e.g. ['UTF-8', 'Hex', 'Base64']. */
  toggleValues?: string[];
  toggleValue?: string;
  hint?: string;
  /** Bounds for numeric arguments; the control enforces them. */
  min?: number;
  max?: number;
}

export interface OperationDef {
  /** Stable kebab-case slug, e.g. 'from-base64'. */
  id: string;
  /** Display name. Matches the established name for the transformation. */
  name: string;
  category: string;
  description: string;
  /** Alternative names people search for: ['b64', 'base64 decode', 'atob']. */
  aliases: string[];
  args: OperationArg[];
  /** True for Fork, Merge, Jump and friends: they steer the recipe, not the data. */
  isFlowControl?: boolean;
}

export interface RecipeStep {
  uid: string;
  opId: string;
  args: OperationArg[];
  disabled: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  steps: RecipeStep[];
}

/** One measurement that contributed to a detection, and its justification. */
export interface Evidence {
  /** Short chip text: 'entropy 5.94'. */
  label: string;
  /** Plain-English tooltip explaining what the measurement means. */
  detail: string;
  /** 0..1 contribution to the confidence score. */
  weight: number;
}

export interface Candidate {
  id: string;
  /** 'Base64', 'Hex', 'JWT'... */
  format: string;
  /** 0..1 */
  confidence: number;
  evidence: Evidence[];
  /** Truncated preview of what decoding would produce. */
  preview: string;
  /** The recipe that performs this decode. */
  steps: RecipeStep[];
}

/** One name the input might go by, and what led there. */
export interface HashMatch {
  /** Algorithm or format name, e.g. 'bcrypt' or 'SHA-256'. */
  name: string;
  /** 0..1. Prefixed formats are near-certain; bare digests are ambiguous. */
  confidence: number;
  /** What in the input led here. */
  reason: string;
  /** Where this format is normally found. */
  context?: string;
}

export interface HashIdentification {
  matches: HashMatch[];
  /** Shape summary shown alongside the matches. */
  summary: string;
  /**
   * True when the value is cryptographically irreversible — a digest.
   *
   * Distinct from `terminal` on purpose. A PNG ends a decoding chain without
   * being one-way in any sense, and telling somebody their picture is a
   * one-way hash is worse than saying nothing.
   */
  oneWay: boolean;
  /** True when nothing further decodes out of this, whatever the reason. */
  terminal?: boolean;
}

/**
 * Why the decoding chain stopped where it did.
 *
 * A chain that simply runs out tells the analyst nothing about whether it
 * finished or gave up, and those are opposite conclusions. 'plain',
 * 'identified' and 'remainder' are answers; 'depth', 'budget', 'cycle' and
 * 'failed' are admissions that there may be more below, and the interface says
 * so.
 *
 * 'remainder' is the case worth spelling out: the chain is finished, but what
 * is left over is not decodable *by nature* rather than by exhaustion — a JWT's
 * signature, a certificate's signature. 'Nothing else decodes' would be true
 * and misleading at the same time.
 */
export type TerminusReason =
  | 'identified'
  | 'plain'
  | 'remainder'
  | 'tooShort'
  | 'depth'
  | 'budget'
  | 'cycle'
  | 'failed';

export interface Terminus {
  reason: TerminusReason;
  /** One sentence, ready to show as it stands. */
  note: string;
  /** True when nothing further can be decoded, as opposed to not yet tried. */
  complete: boolean;
  /** Present when the final value was named rather than decoded. */
  identification?: HashIdentification;
}

export interface Layer {
  id: string;
  depth: number;
  format: string;
  confidence: number;
  byteLength: number;
  /** This layer's decoded output. */
  output: string;
  evidence: Evidence[];
  /** Full chain from the original input down to this node. */
  steps: RecipeStep[];
  children: Layer[];
  /** Set on the last layer only: why the chain ends here. */
  terminus?: Terminus;
}

export type OutputType = 'text' | 'json' | 'bytes' | 'image';

export interface BakeResult {
  output: string;
  outputType: OutputType;
  byteLength: number;
  durationMs: number;
  error?: { stepIndex: number; message: string };
}

/** Thrown by an operation when its input is not something it can process. */
export class OperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OperationError';
  }
}
