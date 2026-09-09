import type { OperationArg, OperationDef } from '../types';

/**
 * Criteria that let the detection engine consider an operation without running
 * it. Be conservative: a criterion that matches too eagerly degrades detection
 * quality for every format, not just this one.
 */
export interface DetectionCriteria {
  /** Inclusive [min, max] Shannon entropy range of plausible input. */
  entropy?: [number, number];
  /** Structural pattern the whole input must match. */
  pattern?: RegExp;
  /** Leading bytes, as a hex string with no separators: '1f8b'. */
  magic?: string;
  /** Input length must be a multiple of this. */
  lengthMultiple?: number;
  /** Display name for the detected layer, when the operation name reads badly. */
  formatName?: string;
  /** Shortest input worth considering. */
  minLength?: number;
  /**
   * For structure a regular expression cannot express — byte distribution,
   * alternating nulls, checksum shape. Returns a [passed, evidence label] pair.
   */
  test?: (text: string, bytes: Uint8Array) => { label: string; detail: string } | null;
  /**
   * What to tell the analyst when a decoding chain ends on this operation's
   * output.
   *
   * Some formats have a remainder that is genuinely not decodable — a JWT's
   * signature, a certificate's signature — and 'nothing else decodes' is a
   * misleading way to describe them. Saying what the remainder *is*, and what
   * to do with it instead, is the difference between a dead end and an answer.
   */
  terminalNote?: string;
}

export interface Operation extends OperationDef {
  /**
   * Transforms the input. Throws OperationError with a descriptive message when
   * the input is not something this operation can process — never returns
   * garbage, and never hangs.
   */
  run: (input: string, args: OperationArg[]) => string | Promise<string>;
  /** Present only on operations that can participate in automatic detection. */
  detection?: DetectionCriteria;
  /** Read by the executor, which handles these itself rather than calling run. */
  isFlowControl?: boolean;
  /**
   * A longer time budget, in milliseconds, for the few operations that are
   * honestly slow rather than stuck: a deliberate work factor, or a search over
   * a key space. The executor's default ceiling exists to catch runaway input,
   * and killing a Bombe run at five seconds would be catching the wrong thing.
   */
  budgetMs?: number;
}

/**
 * Reads a named argument, falling back to the operation's declared default.
 *
 * Overloaded rather than generic so the return type is the widened primitive.
 * A generic would infer the literal type of the fallback, which then makes
 * every comparison against another option look like a type error.
 */
export function arg(args: OperationArg[], name: string, fallback: string): string;
export function arg(args: OperationArg[], name: string, fallback: number): number;
export function arg(args: OperationArg[], name: string, fallback: boolean): boolean;
export function arg(
  args: OperationArg[],
  name: string,
  fallback: string | number | boolean,
): string | number | boolean {
  const found = args.find((a) => a.name === name);
  return found === undefined ? fallback : found.value;
}

export function toggle(args: OperationArg[], name: string, fallback: string): string {
  const found = args.find((a) => a.name === name);
  return found?.toggleValue ?? fallback;
}
