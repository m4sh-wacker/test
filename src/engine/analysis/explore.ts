import type { RecipeStep } from '../types';
import { getOperation } from '../operations';
import { byteLength, previewText } from '../core/bytes';
import { detect } from '../detection/detect';
import type { AnalysisNode, AnalyseOptions } from './types';


interface Region {
  label: string;
  offset: number;
  text: string;
}

const MIN_REGION = 24;
const MAX_REGIONS_PER_NODE = 6;

const REGION_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'JWT', pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]*)?/g },
  { label: 'Base64', pattern: /[A-Za-z0-9+/]{24,}={0,2}/g },
  { label: 'Base64url', pattern: /[A-Za-z0-9_-]{24,}/g },
  { label: 'hex', pattern: /(?:[0-9a-fA-F]{2}){16,}/g },
  { label: 'URL-encoded', pattern: /(?:%[0-9a-fA-F]{2}){4,}[^\s"'<>]*/g },
  { label: 'escaped', pattern: /(?:\\u[0-9a-fA-F]{4}){4,}/g },
];

function findRegions(text: string): Region[] {
  if (text.length < MIN_REGION) return [];
  const sample = text.length > 64 * 1024 ? text.slice(0, 64 * 1024) : text;
  const trimmed = sample.trim();

  const found: Region[] = [];
  const claimed: Array<[number, number]> = [];

  for (const { label, pattern } of REGION_PATTERNS) {
    for (const hit of sample.matchAll(pattern)) {
      const value = hit[0];
      const offset = hit.index ?? 0;
      if (value.length < MIN_REGION) continue;
      if (value === trimmed) continue;

      const end = offset + value.length;
      if (claimed.some(([s, e]) => offset < e && end > s)) continue;

      claimed.push([offset, end]);
      found.push({ label, offset, text: value });
      if (found.length >= MAX_REGIONS_PER_NODE) return found;
    }
  }

  return found;
}

interface Budget {
  nodes: number;
  deadline: number;
  seen: Set<string>;
  truncated: boolean;
}

function exhausted(budget: Budget, options: AnalyseOptions): boolean {
  if (budget.nodes >= options.maxNodes || performance.now() > budget.deadline) {
    budget.truncated = true;
    return true;
  }
  return false;
}

async function decodeBest(
  text: string,
  options: AnalyseOptions,
): Promise<{ output: string; format: string; confidence: number; step: RecipeStep } | null> {
  const candidates = await detect(text);
  const best = candidates[0];
  if (!best || best.confidence < options.threshold) return null;

  const step = best.steps[0];
  if (!step) return null;

  const operation = getOperation(step.opId);
  if (!operation) return null;

  try {
    const output = await Promise.resolve(operation.run(text, step.args));
    if (output === text || output.length === 0) return null;
    return { output, format: best.format, confidence: best.confidence, step };
  } catch {
    return null;
  }
}

function makeNode(
  format: string,
  confidence: number,
  depth: number,
  parentPath: string,
  output: string,
  steps: RecipeStep[],
  origin?: { label: string; offset: number },
): AnalysisNode {
  const path = parentPath.length === 0 ? format : `${parentPath} → ${format}`;
  return {
    id: `${format}-${depth}-${Math.random().toString(36).slice(2, 8)}`,
    format,
    confidence,
    depth,
    path,
    byteLength: byteLength(output),
    output,
    preview: previewText(output, 120),
    steps,
    children: [],
    ...(origin ? { origin } : {}),
  };
}

async function walk(
  node: AnalysisNode,
  options: AnalyseOptions,
  budget: Budget,
): Promise<void> {
  if (node.depth >= options.maxDepth) return;
  if (exhausted(budget, options)) return;

  const whole = await decodeBest(node.output, options);
  if (whole && !budget.seen.has(whole.output)) {
    budget.seen.add(whole.output);
    budget.nodes++;

    const child = makeNode(
      whole.format,
      whole.confidence,
      node.depth + 1,
      node.path,
      whole.output,
      [...node.steps, whole.step],
    );
    node.children.push(child);
    await walk(child, options, budget);
  }

  for (const region of findRegions(node.output)) {
    if (exhausted(budget, options)) return;

    const inner = await decodeBest(region.text, options);
    if (!inner || budget.seen.has(inner.output)) continue;

    budget.seen.add(inner.output);
    budget.nodes++;

    const child = makeNode(
      inner.format,
      inner.confidence,
      node.depth + 1,
      node.path,
      inner.output,
      [...node.steps],
      { label: region.label, offset: region.offset },
    );
    node.children.push(child);
    await walk(child, options, budget);
  }
}

export async function explore(
  input: string,
  options: AnalyseOptions,
): Promise<{ root: AnalysisNode; nodes: number; truncated: boolean }> {
  const root = makeNode('Input', 1, 0, '', input, []);
  root.path = 'Input';

  const budget: Budget = {
    nodes: 1,
    deadline: performance.now() + options.budgetMs,
    seen: new Set([input]),
    truncated: false,
  };

  if (input.trim().length > 0) await walk(root, options, budget);

  return { root, nodes: budget.nodes, truncated: budget.truncated };
}

export { flatten } from './report';
