import type { Analysis, AnalyseOptions } from './types';
import { DEFAULT_ANALYSE_OPTIONS, SEVERITY_ORDER } from './types';
import { explore } from './explore';
import { flatten } from './report';
import { extractIndicators, mergeIndicators } from './indicators';
import { findIssues, mergeFindings } from './findings';

/**
 * The whole analysis: unwrap everything, then scan every layer.
 *
 * The ordering matters. Indicators and findings are gathered *after* the tree
 * is built, from every node in it — so an address or a payload that only
 * becomes visible four layers down is reported with the path that reveals it.
 * Scanning the original blob alone would find none of them, which is the entire
 * point of doing it this way.
 */
export async function analyse(
  input: string,
  options: Partial<AnalyseOptions> = {},
): Promise<Analysis> {
  const started = performance.now();
  const settings = { ...DEFAULT_ANALYSE_OPTIONS, ...options };

  const { root, nodes, truncated } = await explore(input, settings);
  const all = flatten(root);

  const indicators = mergeIndicators(
    all.flatMap((node) => extractIndicators(node.output, node.depth, node.path)),
  );

  const findings = mergeFindings(
    all.flatMap((node) => findIssues(node.output, node.depth, node.path, node.format)),
  ).sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.depth - b.depth,
  );

  return {
    root,
    nodes,
    maxDepth: Math.max(...all.map((node) => node.depth)),
    indicators,
    findings,
    durationMs: performance.now() - started,
    truncated,
  };
}

export { flatten, toMarkdown } from './report';
export { defang } from './indicators';
export { RULE_COUNT } from './findings';
export type {
  Analysis,
  AnalyseOptions,
  AnalysisNode,
  Finding,
  Indicator,
  IndicatorKind,
  Severity,
} from './types';
