import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Copy,
  CornerDownRight,
  FileText,
  Info,
  ShieldAlert,
  Target,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { flatten, formatBytes, toMarkdown } from '../../engine';
import type { AnalysisNode, Finding, Severity } from '../../engine';
import { t } from '../../i18n/en';
import { cx } from '../ui/helpers';

/**
 * The report.
 *
 * Everything else in DecodeBox helps someone transform data. This tells them
 * what they are holding: every layer that was unwrapped, every indicator found
 * at any depth, and every security finding the content justifies — on one
 * screen, in one copy-paste.
 */

const SEVERITY_COLOUR: Record<Severity, string> = {
  critical: 'var(--red)',
  high: 'var(--amber)',
  medium: 'var(--amber)',
  low: 'var(--blue)',
  info: 'var(--text-faint)',
};

function severityIcon(severity: Severity) {
  if (severity === 'critical') return <ShieldAlert size={14} aria-hidden="true" />;
  if (severity === 'high' || severity === 'medium') return <AlertTriangle size={14} aria-hidden="true" />;
  return <Info size={14} aria-hidden="true" />;
}

function FindingCard({ finding }: { finding: Finding }) {
  const colour = SEVERITY_COLOUR[finding.severity];

  return (
    <li
      className="rounded-control border border-line border-s-2 bg-surface p-3"
      style={{ borderInlineStartColor: colour }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span style={{ color: colour }} className="flex items-center">
          {severityIcon(finding.severity)}
        </span>
        <span
          className="font-mono text-micro uppercase tracking-wider"
          style={{ color: colour }}
        >
          {finding.severity}
        </span>
        <h3 className="text-xs2 font-medium">{finding.title}</h3>
        {finding.reference && (
          <span className="rounded-chip border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint">
            {finding.reference}
          </span>
        )}
      </div>

      <p className="mt-2 max-w-3xl text-xs2 leading-relaxed text-muted">{finding.detail}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-micro">
        <span className="text-faint">{t.report.foundAt}</span>
        <span className="font-mono" style={{ color: 'var(--purple)' }}>
          {finding.path}
        </span>
      </div>

      <pre className="mt-2 overflow-x-auto rounded-chip border border-line bg-surface-2 px-2.5 py-1.5 font-mono text-micro text-muted">
        {finding.evidence.slice(0, 300)}
      </pre>
    </li>
  );
}

function TreeNode({ node, last }: { node: AnalysisNode; last: boolean }) {
  const [open, setOpen] = useState(node.depth < 3);
  const hasChildren = node.children.length > 0;

  return (
    <li className={cx('relative', node.depth > 0 && 'ms-4 ps-4')}>
      {node.depth > 0 && (
        <>
          <span
            aria-hidden="true"
            className={cx('absolute start-0 top-0 w-px bg-line', last ? 'h-4' : 'h-full')}
          />
          <span aria-hidden="true" className="absolute start-0 top-4 h-px w-3 bg-line" />
        </>
      )}

      <div className="flex flex-wrap items-center gap-2 py-1">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? t.report.collapse : t.report.expand}
            className="rounded p-0.5 text-faint transition-colors hover:text-text"
          >
            <ChevronRight
              size={12}
              aria-hidden="true"
              className={cx('transition-transform duration-150', open && 'rotate-90')}
            />
          </button>
        ) : (
          <span aria-hidden="true" className="w-[18px]" />
        )}

        <span
          className={cx(
            'rounded-full border px-2 py-0.5 font-mono text-micro',
            node.depth === 0
              ? 'border-line text-faint'
              : 'border-purple-line bg-purple-soft text-text',
          )}
        >
          {node.format}
        </span>

        {node.origin && (
          <span
            className="flex items-center gap-1 font-mono text-[10px] text-faint"
            title={t.report.embeddedAt(node.origin.offset)}
          >
            <CornerDownRight size={10} aria-hidden="true" />
            {t.report.embedded(node.origin.label)}
          </span>
        )}

        <span className="font-mono text-[10px] text-faint">{formatBytes(node.byteLength)}</span>

        <span className="min-w-0 flex-1 truncate font-mono text-micro text-muted">
          {node.preview}
        </span>
      </div>

      {open && hasChildren && (
        <ul>
          {node.children.map((child, i) => (
            <TreeNode key={child.id} node={child} last={i === node.children.length - 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

function Stat({ value, label, colour }: { value: number | string; label: string; colour?: string }) {
  return (
    <div className="rounded-control border border-line bg-surface px-3 py-2">
      <div className="font-brand text-section font-semibold" style={colour ? { color: colour } : undefined}>
        {value}
      </div>
      <div className="mt-0.5 text-micro text-faint">{label}</div>
    </div>
  );
}

export function ReportView() {
  const analysis = useStore((s) => s.analysis);
  const analysing = useStore((s) => s.analysing);
  const input = useStore((s) => s.input);
  const [copied, setCopied] = useState(false);

  if (input.trim().length === 0) {
    return (
      <div className="grid flex-1 place-items-center p-8 text-center">
        <div className="max-w-md">
          <FileText size={28} aria-hidden="true" className="mx-auto text-faint" />
          <h2 className="mt-3 font-brand text-card font-semibold">{t.report.emptyTitle}</h2>
          <p className="mt-2 text-xs2 text-muted">{t.report.emptyDetail}</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="grid flex-1 place-items-center p-8">
        <p className="text-xs2 text-faint">{analysing ? t.report.working : t.report.pending}</p>
      </div>
    );
  }

  const critical = analysis.findings.filter((f) => f.severity === 'critical').length;
  const high = analysis.findings.filter((f) => f.severity === 'high').length;
  const worst = critical > 0 ? 'var(--red)' : high > 0 ? 'var(--amber)' : undefined;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toMarkdown(analysis));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard denied */
    }
  };

  const layers = flatten(analysis.root).filter((n) => n.depth > 0);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-brand text-section font-semibold">{t.report.title}</h1>
            <p className="mt-1 text-xs2 text-muted">
              {layers.length === 0
                ? t.report.summaryPlain
                : t.report.summary(
                    [...new Set(layers.map((l) => l.format))].join(' · '),
                    analysis.maxDepth,
                  )}
            </p>
          </div>

          <button
            type="button"
            onClick={copy}
            className="flex shrink-0 items-center gap-2 rounded-control border border-purple-line bg-purple-soft px-3 py-1.5 text-xs2 font-medium transition-colors hover:border-purple"
          >
            {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
            {copied ? t.report.copied : t.report.copy}
          </button>
        </header>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat value={analysis.findings.length} label={t.report.findings} colour={worst} />
          <Stat value={analysis.indicators.length} label={t.report.indicators} />
          <Stat value={analysis.nodes} label={t.report.layers} />
          <Stat value={`${analysis.durationMs.toFixed(0)} ms`} label={t.report.took} />
        </div>

        {analysis.truncated && (
          <p className="rounded-control border border-line px-3 py-2 text-micro" style={{ color: 'var(--amber)' }}>
            {t.report.truncated}
          </p>
        )}

        <section>
          <h2 className="mb-2 flex items-center gap-2 font-mono text-micro uppercase tracking-[0.1em]" style={{ color: 'var(--purple)' }}>
            <ShieldAlert size={13} aria-hidden="true" />
            {t.report.findings}
          </h2>
          {analysis.findings.length === 0 ? (
            <p className="rounded-control border border-dashed border-line px-3 py-6 text-center text-xs2 text-faint">
              {t.report.noFindings}
            </p>
          ) : (
            <ul className="space-y-2">
              {analysis.findings.map((finding) => (
                <FindingCard key={finding.id} finding={finding} />
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-2 font-mono text-micro uppercase tracking-[0.1em]" style={{ color: 'var(--purple)' }}>
            <Target size={13} aria-hidden="true" />
            {t.report.indicators}
          </h2>
          {analysis.indicators.length === 0 ? (
            <p className="rounded-control border border-dashed border-line px-3 py-6 text-center text-xs2 text-faint">
              {t.report.noIndicators}
            </p>
          ) : (
            <>
              {/* Below the tablet breakpoint a three-column table of long
                  values wraps one character at a time. Cards instead. */}
              <ul className="space-y-1.5 md:hidden">
                {analysis.indicators.map((indicator) => (
                  <li
                    key={`m-${indicator.kind}-${indicator.value}`}
                    className="rounded-control border border-line bg-surface p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-micro text-faint">{indicator.kind}</span>
                      <span className="truncate font-mono text-[10px] text-faint">
                        {indicator.path}
                      </span>
                    </div>
                    <p className="mt-1 break-all font-mono text-micro">{indicator.defanged}</p>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto rounded-control border border-line md:block">
              <table className="w-full text-start text-micro">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-faint">
                    <th className="px-3 py-2 text-start font-medium">{t.report.type}</th>
                    <th className="px-3 py-2 text-start font-medium">{t.report.value}</th>
                    <th className="px-3 py-2 text-start font-medium">{t.report.foundAt}</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.indicators.map((indicator) => (
                    <tr key={`${indicator.kind}-${indicator.value}`} className="border-b border-line last:border-0">
                      <td className="whitespace-nowrap px-3 py-1.5 font-mono text-faint">
                        {indicator.kind}
                      </td>
                      <td className="px-3 py-1.5 font-mono">
                        <span className="break-all">{indicator.defanged}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 font-mono text-faint">
                        {indicator.path}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
          <p className="mt-1.5 text-micro text-faint">{t.report.defangNote}</p>
        </section>

        <section>
          <h2 className="mb-2 font-mono text-micro uppercase tracking-[0.1em]" style={{ color: 'var(--purple)' }}>
            {t.report.structure}
          </h2>
          <div className="rounded-control border border-line bg-surface p-3">
            <ul>
              <TreeNode node={analysis.root} last />
            </ul>
          </div>
        </section>

        <p className="pb-4 text-center text-micro text-faint">{t.report.privacy}</p>
      </div>
    </div>
  );
}
