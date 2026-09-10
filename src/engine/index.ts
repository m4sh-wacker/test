/**
 * The engine facade — the only module the interface imports from.
 *
 * Everything the UI knows about transformation and detection passes through
 * these functions. Keeping the boundary this narrow is what lets the engine and
 * the interface be developed, tested, and replaced independently.
 *
 * The facade is also where the engine is *loaded*. Five hundred operations and
 * the algorithms behind them are the bulk of the build and none of it is needed
 * to draw a window, so every entry point reaches them through a dynamic import
 * of `./heavy` rather than a static one. The shell paints immediately; the
 * engine arrives a moment later, before anyone has finished pasting anything.
 * The import is cached by the module system, so only the first call waits.
 *
 * The sync exports at the bottom are the exception, and each one is deliberate:
 * they are small, pure, and used on every render — byte formatting, the layer
 * chain, the category list. None of them can reach an operation.
 */

import type { BakeResult, HashIdentification, Layer, Candidate, OperationDef, Recipe } from './types';
import type { AutoDecodeOptions } from './detection/autoDecode';
import type { Analysis, AnalyseOptions } from './analysis';
import type { CtfOptions, CtfReport } from './ctf/types';
import { bytesToLatin1 } from './core/bytes';
import { encodeCharsetLossy, ENCODABLE_CHARSET_NAMES } from './core/charsets';
import { offload } from './worker/client';

/** The one place the engine is pulled in. Everything below waits on this. */
const engine = () => import('./heavy');

export async function listOperations(): Promise<OperationDef[]> {
  return (await engine()).publicDefinitions();
}

export async function bake(input: string, recipe: Recipe): Promise<BakeResult> {
  return offload(input, { kind: 'bake', input, recipe }, async () =>
    (await engine()).bake(input, recipe),
  );
}

export async function detect(input: string): Promise<Candidate[]> {
  return offload(input, { kind: 'detect', input }, async () => (await engine()).detect(input));
}

export async function autoDecode(
  input: string,
  options?: Partial<AutoDecodeOptions>,
): Promise<Layer> {
  return offload(input, { kind: 'autoDecode', input, options }, async () =>
    (await engine()).autoDecode(input, options),
  );
}

/**
 * Names what the input *is*, for the cases where that is the answer.
 *
 * Digests, keys, certificates, UUIDs, serialized objects, timestamps: none of
 * these decode into anything, and a tool that only decodes leaves the analyst
 * with nothing. Ranked and evidenced like every other claim the engine makes.
 */
export async function identify(input: string): Promise<HashIdentification | null> {
  return (await engine()).identify(input);
}

/**
 * The full analysis: unwrap everything, then report what is inside and what is
 * dangerous about it.
 *
 * This is the function that makes DecodeBox an analysis tool rather than a
 * transformation one. Decoding tells you what the bytes say; this tells you
 * what they mean — every indicator at every depth, and every security finding
 * the content justifies.
 */
export async function analyse(input: string, options?: Partial<AnalyseOptions>): Promise<Analysis> {
  // Analysis is the heaviest thing the engine does — a tree walk plus a
  // 255-key brute force at every unexplained node. It is the call that most
  // needs to be off the main thread.
  return offload(input, { kind: 'analyse', input, options }, async () =>
    (await engine()).analyse(input, options),
  );
}

/**
 * CTF mode: the ranked list of things worth trying, with the reason for each.
 *
 * Kept separate from `analyse` because it answers a different question and
 * costs differently — it recovers cipher keys by search, which is worth doing
 * on demand and wasteful to do on every keystroke.
 */
export async function hints(input: string, options?: Partial<CtfOptions>): Promise<CtfReport> {
  return offload(input, { kind: 'hints', input, options }, async () =>
    (await engine()).ctfHints(input, options),
  );
}

/* ------------------------------------------------- small, synchronous, safe */

/**
 * The character sets typed input can be read as, plus the raw reading for data
 * that is already bytes.
 *
 * The engine treats everything between steps as a byte string, one character
 * per byte. Text a person typed is not that yet, so it is converted once, here
 * at the edge — exactly as a terminal or an editor decides an encoding when it
 * writes a file. Doing it per operation instead is how a gzip stream ends up
 * with 0x8B written as 0xC2 0x8B.
 */
export const INPUT_ENCODINGS: string[] = ['Raw bytes', ...ENCODABLE_CHARSET_NAMES];

export { asBytes } from './core/bytes';
// Display, not transformation: how the output pane reads a result.
export { hexdumpOf, toBase64 } from './core/views';

export function encodeInput(text: string, encoding: string): string {
  if (encoding === 'Raw bytes' || !INPUT_ENCODINGS.includes(encoding)) return text;
  return bytesToLatin1(encodeCharsetLossy(encoding, text));
}

export { CATEGORY_ORDER } from './operations/categories';
export { workerActive, WORKER_THRESHOLD } from './worker/client';
export {
  toChain,
  describeChain,
  summariseChain,
  describeRuns,
  chainConfidence,
  chainPreview,
  terminusOf,
  terminusName,
  lastLayer,
} from './detection/chain';
export { toMarkdown, flatten } from './analysis/report';
// Pure functions over a tree that is already in memory, so they belong in
// the shell alongside the chain helpers rather than behind the worker.
export { findInLayers, isValidQuery, DEFAULT_FIND_OPTIONS } from './analysis/find';
export type { LayerMatch, FindOptions } from './analysis/find';
export { explain } from './analysis/explain';
export {
  entropyProfile,
  standoutRegions,
  bandOf,
  MIN_FOR_PROFILE,
} from './analysis/entropy';
export type { EntropyBucket, EntropyBand } from './analysis/entropy';
export type { Explanation } from './analysis/explain';
export { defang } from './analysis/indicators';
export { RULE_COUNT } from './analysis/findings';
export { KIND_ORDER } from './ctf/types';
export { formatBytes, truncate, renderText } from './core/bytes';
export { imageMimeOf } from './core/imageMime';
export { fileSignatureOf } from './core/signatures';
export type { Signature } from './core/signatures';
export { CHARSET_NAMES, ENCODABLE_CHARSET_NAMES } from './core/charsets';

export type { AutoDecodeOptions } from './detection/autoDecode';
export type { ChainRun } from './detection/chain';
export type { CtfOptions, CtfReport, FoundFlag, Hint, HintKind } from './ctf/types';
export type {
  Analysis,
  AnalyseOptions,
  AnalysisNode,
  Finding,
  Indicator,
  IndicatorKind,
  Severity,
} from './analysis/types';
export type {
  BakeResult,
  Candidate,
  Evidence,
  HashIdentification,
  HashMatch,
  Layer,
  OperationArg,
  OperationDef,
  OutputType,
  Recipe,
  RecipeStep,
  Terminus,
  TerminusReason,
} from './types';
