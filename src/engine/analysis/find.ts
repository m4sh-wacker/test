import type { AnalysisNode } from './types';
import type { RecipeStep } from '../types';
import { flatten } from './report';

/**
 * Finding a string anywhere in the onion.
 *
 * The question this answers is the one nesting makes expensive: "is `admin`
 * in here anywhere?" A payload wrapped six times has seven bodies of text, six
 * of which do not exist until something decodes them, and none of which the
 * browser's own find-in-page can see. Without this the work is manual — decode
 * a layer, look, decode the next — which is exactly the drudgery the rest of
 * the tool exists to remove.
 *
 * The tree is already built by `explore` for every input, so this costs a walk
 * over text that is in memory anyway. It searches embedded regions too: a token
 * buried in one field of a JSON body is a node like any other.
 */

export interface LayerMatch {
  nodeId: string;
  /** 'Base64', 'JSON'… or 'Input' for the untouched text. */
  format: string;
  depth: number;
  /** How this layer was reached, e.g. 'Input → Base64 → gzip'. */
  path: string;
  /** Where in this layer's own text the match starts. */
  offset: number;
  /** The text that matched, which for a pattern is not the query. */
  match: string;
  before: string;
  after: string;
  /** The recipe that reaches this layer, where one can be expressed. */
  steps: RecipeStep[];
}

export interface FindOptions {
  caseSensitive: boolean;
  /** Read the query as a regular expression rather than as literal text. */
  regex: boolean;
  maxPerLayer: number;
  maxTotal: number;
  /** Characters of surrounding text kept on each side of a match. */
  context: number;
}

export const DEFAULT_FIND_OPTIONS: FindOptions = {
  caseSensitive: false,
  regex: false,
  maxPerLayer: 20,
  maxTotal: 200,
  context: 40,
};

/**
 * The most text this will scan in any one layer.
 *
 * A decompression bomb or a very large file produces layers of arbitrary size,
 * and a search is triggered on every keystroke. The cap is generous enough that
 * it never bites on anything a person pasted and small enough that it cannot
 * lock the tab.
 */
const MAX_SCAN = 512 * 1024;

function escapeLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds the matcher, or returns null for a pattern that will not compile.
 *
 * A user's own regular expression running over their own data in their own tab
 * is their business, and this deliberately does not try to second-guess it. It
 * cannot: catastrophic backtracking is undecidable in general, and the only
 * real defences are a different engine or a worker that can be killed. What is
 * bounded here is the amount of text fed to it and the number of matches kept,
 * which is what turns a slow pattern into a slow keystroke rather than a dead
 * page.
 */
function matcher(query: string, options: FindOptions): RegExp | null {
  const source = options.regex ? query : escapeLiteral(query);
  try {
    return new RegExp(source, options.caseSensitive ? 'g' : 'gi');
  } catch {
    return null;
  }
}

function searchNode(
  node: AnalysisNode,
  pattern: RegExp,
  options: FindOptions,
  remaining: number,
): LayerMatch[] {
  const text = node.output.length > MAX_SCAN ? node.output.slice(0, MAX_SCAN) : node.output;
  const found: LayerMatch[] = [];

  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (found.length >= options.maxPerLayer || found.length >= remaining) break;

    const offset = match.index;
    found.push({
      nodeId: node.id,
      format: node.format,
      depth: node.depth,
      path: node.path,
      offset,
      match: match[0],
      before: text.slice(Math.max(0, offset - options.context), offset),
      after: text.slice(offset + match[0].length, offset + match[0].length + options.context),
      steps: node.steps,
    });

    // A pattern that can match nothing would otherwise never advance.
    if (match[0].length === 0) pattern.lastIndex += 1;
  }

  return found;
}

export function findInLayers(
  root: AnalysisNode,
  query: string,
  options: Partial<FindOptions> = {},
): LayerMatch[] {
  const opts = { ...DEFAULT_FIND_OPTIONS, ...options };
  if (query.length === 0) return [];

  const pattern = matcher(query, opts);
  if (!pattern) return [];

  const matches: LayerMatch[] = [];
  // Shallowest first: a hit in the input is easier to explain than the same
  // hit four decodes down, and if both exist the reader wants to know that.
  for (const node of flatten(root).sort((a, b) => a.depth - b.depth)) {
    if (matches.length >= opts.maxTotal) break;
    matches.push(...searchNode(node, pattern, opts, opts.maxTotal - matches.length));
  }

  return matches;
}

/** Whether a pattern is one the engine can actually compile. */
export function isValidQuery(query: string, regex: boolean): boolean {
  if (!regex || query.length === 0) return true;
  try {
    new RegExp(query);
    return true;
  } catch {
    return false;
  }
}
