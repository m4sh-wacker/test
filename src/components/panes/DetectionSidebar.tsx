import { useState } from 'react';
import { AlertTriangle, ChevronRight, FileCode2, Info, Target } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { AnalysisNode, Finding, Indicator, Severity } from '../../engine';
import { t } from '../../i18n/en';
import { cx } from '../ui/helpers';
import { formatBytes } from '../../engine';

/**
 * The second sidebar view: what the analyser found, as a tree.
 *
 * A decode tree is already shaped like a file tree — a root, branches that are
 * layers, leaves that are the plaintext at the bottom — so the Explorer idiom
 * fits it without being forced. Clicking a node selects that layer, which is
 * the same contract the old report view had.
 *
 * Findings and indicators sit underneath as collapsible sections, the way an
 * editor stacks Outline and Timeline under the file tree.
 */

const SEVERITY_COLOUR: Record<Severity, string> = {
  critical: 'var(--red)',
  high: 'var(--red)',
  medium: 'var(--amber)',
  low: 'var(--blue)',
  info: 'var(--text-faint)',
};

/** A collapsible section header, the shape VS Code gives its sidebar panels. */
function Section({
  title,
  count,
  children,
  defaultOpen = true,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-1 bg-surface-2 px-1 py-1 text-start hover:bg-surface-3"
      >
        <ChevronRight
          size={14}
          aria-hidden="true"
          className={cx('shrink-0 text-muted transition-transform duration-100', open && 'rotate-90')}
        />
        <span className="flex-1 truncate text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">
          {title}
        </span>
        <span className="pe-1.5 font-mono text-[10px] tabular-nums text-faint">{count}</span>
      </button>
      {open && children}
    </div>
  );
}

/** One layer of the decode tree, indented by depth like a file row. */
function Node({ node, depth }: { node: AnalysisNode; depth: number }) {
  const activeLayerId = useStore((s) => s.activeLayerId);
  const setActiveLayer = useStore((s) => s.setActiveLayer);
  const [open, setOpen] = useState(true);
  const active = activeLayerId === node.id;
  const hasChildren = node.children.length > 0;

  return (
    <>
      <div
        data-active={active}
        className="vs-row group flex items-center gap-1 pe-1.5 text-[12px]"
        style={{ paddingInlineStart: 4 + depth * 10 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? t.detectionTree.collapse(node.format) : t.detectionTree.expand(node.format)}
            className="grid h-5 w-4 shrink-0 place-items-center text-muted"
          >
            <ChevronRight
              size={13}
              aria-hidden="true"
              className={cx('transition-transform duration-100', open && 'rotate-90')}
            />
          </button>
        ) : (
          <span className="h-5 w-4 shrink-0" aria-hidden="true" />
        )}

        <button
          type="button"
          onClick={() => setActiveLayer(node.id)}
          aria-current={active ? 'true' : undefined}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5 text-start"
        >
          <FileCode2
            size={13}
            aria-hidden="true"
            className="shrink-0"
            style={{ color: active ? 'var(--purple-text)' : 'var(--text-faint)' }}
          />
          <span className={cx('truncate font-mono', active ? 'text-text' : 'text-muted')}>
            {node.format}
          </span>
          {node.origin && (
            <span className="shrink-0 truncate font-mono text-[10px] text-faint">
              @{node.origin.offset}
            </span>
          )}
        </button>

        <span className="shrink-0 font-mono text-[10px] tabular-nums text-faint">
          {formatBytes(node.byteLength)}
        </span>
      </div>

      {open && node.children.map((child) => <Node key={child.id} node={child} depth={depth + 1} />)}
    </>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  return (
    <div className="vs-row flex items-start gap-1.5 px-2 py-1 text-[12px]">
      <AlertTriangle
        size={12}
        aria-hidden="true"
        className="mt-[3px] shrink-0"
        style={{ color: SEVERITY_COLOUR[finding.severity] }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-muted" title={finding.detail}>
          {finding.title}
        </p>
        <p className="truncate font-mono text-[10px] text-faint">{finding.path}</p>
      </div>
    </div>
  );
}

function IndicatorRow({ indicator }: { indicator: Indicator }) {
  return (
    <div className="vs-row flex items-center gap-1.5 px-2 py-1 text-[12px]">
      <Target size={12} aria-hidden="true" className="shrink-0 text-faint" />
      <span className="w-12 shrink-0 truncate font-mono text-[10px] uppercase text-faint">
        {indicator.kind}
      </span>
      {/* Defanged, because this list gets copied into tickets. */}
      <span className="min-w-0 flex-1 truncate font-mono text-muted" title={indicator.defanged}>
        {indicator.defanged}
      </span>
    </div>
  );
}

export function DetectionSidebar() {
  const analysis = useStore((s) => s.analysis);
  const analysing = useStore((s) => s.analysing);

  return (
    <section aria-label={t.detectionTree.title} className="flex min-h-0 flex-1 flex-col bg-surface">
      <h2 className="flex h-9 shrink-0 items-center gap-2 px-4 text-[11px] font-normal uppercase tracking-[0.08em] text-muted">
        {t.detectionTree.title}
      </h2>

      {!analysis ? (
        <p className="flex items-start gap-1.5 px-4 py-3 text-[12px] text-faint">
          <Info size={13} aria-hidden="true" className="mt-[2px] shrink-0" />
          {analysing ? t.detectionTree.working : t.detectionTree.empty}
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Section title={t.detectionTree.layers} count={analysis.nodes}>
            <div className="py-0.5">
              <Node node={analysis.root} depth={0} />
            </div>
          </Section>

          <Section
            title={t.detectionTree.findings}
            count={analysis.findings.length}
            defaultOpen={analysis.findings.length > 0}
          >
            {analysis.findings.length === 0 ? (
              <p className="px-4 py-2 text-[12px] text-faint">{t.detectionTree.noFindings}</p>
            ) : (
              analysis.findings.map((f) => <FindingRow key={f.id} finding={f} />)
            )}
          </Section>

          <Section
            title={t.detectionTree.indicators}
            count={analysis.indicators.length}
            defaultOpen={analysis.indicators.length > 0}
          >
            {analysis.indicators.length === 0 ? (
              <p className="px-4 py-2 text-[12px] text-faint">{t.detectionTree.noIndicators}</p>
            ) : (
              analysis.indicators.map((i) => (
                <IndicatorRow key={`${i.kind}:${i.value}:${i.depth}`} indicator={i} />
              ))
            )}
          </Section>

          {analysis.truncated && (
            <p className="px-4 py-2 text-[11px]" style={{ color: 'var(--amber)' }}>
              {t.detectionTree.truncated}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
