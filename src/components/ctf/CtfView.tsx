import { useState } from 'react';
import {
  Binary,
  Check,
  Copy,
  Fingerprint,
  Flag,
  KeyRound,
  Play,
  RefreshCw,
  Search,
  Shapes,
  Unlock,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Hint, HintKind } from '../../engine';
import { t } from '../../i18n/en';
import { confidenceColor, cx } from '../ui/helpers';
import { Button, ConfidenceBar } from '../ui/primitives';

/**
 * Search.
 *
 * The workspace answers "what does this become?" and the report answers "what
 * does this mean?". This answers the question somebody actually stuck has: what
 * should I try next, and why would I bother?
 *
 * Every row is a claim with its evidence attached and a button that carries it
 * out. The evidence is not decoration — a ranked list with no reasons is a slot
 * machine, and the point of this tool is that the person can tell a measurement
 * from a guess before they spend a click on it.
 */

const KIND_ICON: Record<HintKind, typeof Flag> = {
  flag: Flag,
  decode: Binary,
  crack: KeyRound,
  shape: Shapes,
  identify: Fingerprint,
  inspect: Search,
};

const KIND_COLOUR: Record<HintKind, string> = {
  flag: 'var(--green)',
  decode: 'var(--purple-text)',
  crack: 'var(--purple-text)',
  shape: 'var(--blue)',
  identify: 'var(--text-muted)',
  inspect: 'var(--text-muted)',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        });
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded-control border border-line px-2 py-1 text-micro text-muted transition-colors hover:border-line-strong hover:text-text"
    >
      {copied ? <Check size={11} aria-hidden="true" /> : <Copy size={11} aria-hidden="true" />}
      {copied ? t.ctf.copied : t.ctf.copy}
    </button>
  );
}

function Where({ hint }: { hint: Hint }) {
  return (
    <span className="font-mono text-micro text-faint">
      {hint.depth === 0 ? t.ctf.atInput : t.ctf.atDepth(hint.depth, hint.path)}
    </span>
  );
}

function HintRow({ hint }: { hint: Hint }) {
  const applyHint = useStore((s) => s.applyHint);
  const Icon = KIND_ICON[hint.kind];
  const colour = KIND_COLOUR[hint.kind];
  const actionable = hint.steps.length > 0;

  return (
    <li
      className="rounded-control border border-line border-s-2 bg-surface p-3"
      style={{ borderInlineStartColor: colour }}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span style={{ color: colour }} className="flex shrink-0 items-center">
          <Icon size={14} aria-hidden="true" />
        </span>
        <span
          className="shrink-0 font-mono text-micro uppercase tracking-wider"
          style={{ color: colour }}
        >
          {t.ctf.kinds[hint.kind]}
        </span>

        <h3
          className={cx(
            'min-w-0 flex-1 text-xs2 font-medium',
            hint.kind === 'flag' && 'break-all font-mono',
          )}
        >
          {hint.title}
        </h3>

        <span className="flex shrink-0 items-center gap-2 text-micro text-muted">
          <ConfidenceBar value={hint.confidence} />
          <span style={{ color: confidenceColor(hint.confidence) }}>
            {Math.round(hint.confidence * 100)}%
          </span>
        </span>

        {hint.kind === 'flag' && <CopyButton text={hint.title} />}

        {actionable ? (
          <Button
            variant="primary"
            onClick={() => applyHint(hint)}
            title={t.ctf.applyHint}
            className="shrink-0 !py-1 !text-micro"
          >
            <Play size={11} aria-hidden="true" />
            {t.ctf.apply}
          </Button>
        ) : (
          <span className="shrink-0 text-micro text-faint">{t.ctf.noSteps}</span>
        )}
      </div>

      <p className="mt-2 max-w-4xl text-xs2 leading-relaxed text-muted">{hint.reason}</p>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Where hint={hint} />
        {hint.preview && hint.kind !== 'flag' && (
          <pre className="min-w-0 flex-1 overflow-x-auto rounded-chip border border-line bg-surface-2 px-2.5 py-1.5 font-mono text-micro text-muted">
            {hint.preview}
          </pre>
        )}
      </div>
    </li>
  );
}

function Toolbar() {
  const format = useStore((s) => s.ctfFormat);
  const setCtfFormat = useStore((s) => s.setCtfFormat);
  const runCtf = useStore((s) => s.runCtf);
  const running = useStore((s) => s.ctfRunning);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-micro text-faint">{t.ctf.format}</span>
        <input
          type="text"
          value={format}
          spellCheck={false}
          placeholder="picoCTF"
          onChange={(e) => setCtfFormat(e.target.value)}
          className="w-44 rounded-control border border-line bg-surface-2 px-2.5 py-1.5 font-mono text-xs2 text-text outline-none transition-colors focus:border-purple-line"
        />
      </label>

      <Button onClick={() => void runCtf()} disabled={running}>
        <RefreshCw
          size={12}
          aria-hidden="true"
          className={cx(running && 'animate-spin')}
        />
        {running ? t.ctf.working : t.ctf.run}
      </Button>

      <p className="min-w-0 flex-1 basis-64 text-micro leading-relaxed text-faint">
        {t.ctf.formatHint}
      </p>
    </div>
  );
}

export function CtfView() {
  const report = useStore((s) => s.ctf);
  const running = useStore((s) => s.ctfRunning);
  const input = useStore((s) => s.input);

  if (input.trim().length === 0) {
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <Flag size={22} aria-hidden="true" className="text-faint" />
        <h2 className="text-sm font-medium">{t.ctf.emptyTitle}</h2>
        <p className="max-w-md text-xs2 leading-relaxed text-muted">{t.ctf.emptyDetail}</p>
      </main>
    );
  }

  const flags = report?.flags ?? [];

  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        <header className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-sm font-semibold">{t.ctf.title}</h1>
            <p className="text-micro text-muted">{t.ctf.subtitle}</p>
            {report && (
              <span className="ms-auto font-mono text-micro text-faint">
                {t.ctf.layers(report.layers)} · {Math.round(report.durationMs)} ms
              </span>
            )}
          </div>
          <Toolbar />
        </header>

        {/* The flag banner. If there is one, it is the answer, and it does not
            belong in a ranked list of maybes. */}
        {flags.length > 0 && (
          <section
            className="rounded-card border border-s-2 bg-surface p-3"
            style={{ borderColor: 'var(--line)', borderInlineStartColor: 'var(--green)' }}
          >
            <h2 className="flex items-center gap-2 text-xs2 font-medium">
              <Unlock size={13} aria-hidden="true" style={{ color: 'var(--green)' }} />
              {t.ctf.flagsFound(flags.length)}
            </h2>
            <ul className="mt-2 space-y-1.5">
              {flags.map((flag) => (
                <li key={flag.text} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <code className="min-w-0 break-all font-mono text-xs2 text-text">{flag.text}</code>
                  <span className="font-mono text-micro text-faint">
                    {flag.depth === 0 ? t.ctf.atInput : t.ctf.atDepth(flag.depth, flag.path)}
                  </span>
                  <CopyButton text={flag.text} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-micro uppercase tracking-wider text-faint">{t.ctf.hints}</h2>

          {running && !report ? (
            <p className="text-xs2 text-muted">{t.ctf.working}</p>
          ) : report && report.hints.length > 0 ? (
            <ul className="space-y-2">
              {report.hints.map((hint) => (
                <HintRow key={hint.id} hint={hint} />
              ))}
            </ul>
          ) : (
            <p className="text-xs2 text-muted">
              {flags.length > 0 ? t.ctf.noHints : `${t.ctf.noFlags} ${t.ctf.noHints}`}
            </p>
          )}
        </section>

        {report?.truncated && (
          <p className="text-micro" style={{ color: 'var(--amber)' }}>
            {t.ctf.truncated}
          </p>
        )}

        <p className="border-t border-line pt-3 text-micro text-faint">{t.ctf.privacy}</p>
      </div>
    </main>
  );
}
