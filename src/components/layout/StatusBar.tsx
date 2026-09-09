import { useStore } from '../../store/useStore';
import { formatBytes } from '../../engine';
import { t } from '../../i18n/en';

function Dot({ state }: { state: 'idle' | 'busy' | 'error' }) {
  const color = {
    idle: 'var(--text-faint)',
    busy: 'var(--amber)',
    error: 'var(--red)',
  }[state];
  return (
    <span
      aria-hidden="true"
      className="inline-block h-1.5 w-1.5 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

export function StatusBar() {
  const result = useStore((s) => s.bakeResult);
  const baking = useStore((s) => s.baking);
  const analysing = useStore((s) => s.analysing);
  const steps = useStore((s) => s.steps);
  const pausedAt = useStore((s) => s.pausedAt);

  const state = result?.error ? 'error' : baking || analysing ? 'busy' : 'idle';
  const label =
    state === 'busy'
      ? t.status.working
      : state === 'error'
        ? t.status.failed
        : pausedAt !== null
          ? t.status.paused
          : t.status.ready;

  return (
    <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-line bg-surface px-4 text-micro text-faint">
      <span className="flex items-center gap-1.5">
        <Dot state={state} />
        {label}
      </span>

      {/* The byte and line counts used to live here, and only here, which put
          them as far from the pane they describe as the window allows. They are
          in the pane headers now; repeating them would just be noise. */}

      {steps.length > 0 && (
        <span className="hidden sm:inline">
          {t.status.steps}: {steps.filter((s) => !s.disabled).length}/{steps.length}
        </span>
      )}

      {result && !result.error && (
        <span className="hidden md:inline">
          {t.status.output}: {formatBytes(result.byteLength)}
        </span>
      )}

      {/* One right-aligned group rather than two competing `ms-auto`s, which is
          what let the timing and the privacy line each claim the same edge. */}
      <span className="ms-auto flex items-center gap-4">
        {result && !result.error && (
          <span className="font-mono">{result.durationMs.toFixed(1)} ms</span>
        )}
        <a
          href="https://owasp.org"
          target="_blank"
          rel="noreferrer noopener"
          className="hidden transition-colors duration-150 ease-smooth hover:text-text sm:inline"
        >
          {t.status.owasp}
        </a>
        <span className="hidden lg:inline">{t.status.privacy}</span>
      </span>
    </footer>
  );
}
