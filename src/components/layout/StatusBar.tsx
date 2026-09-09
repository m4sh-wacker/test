import { useStore } from '../../store/useStore';
import { encodeInput, formatBytes } from '../../engine';
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
  const input = useStore((s) => s.input);
  const inputEncoding = useStore((s) => s.inputEncoding);
  const result = useStore((s) => s.bakeResult);
  const baking = useStore((s) => s.baking);
  const analysing = useStore((s) => s.analysing);
  const steps = useStore((s) => s.steps);
  const pausedAt = useStore((s) => s.pausedAt);

  const lines = input.length === 0 ? 0 : input.split('\n').length;
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

      <span className="hidden sm:inline">
        {t.status.input}: {formatBytes(encodeInput(input, inputEncoding).length)}
      </span>
      <span className="hidden md:inline">
        {t.status.lines}: {lines}
      </span>

      {steps.length > 0 && (
        <span className="hidden sm:inline">
          {t.status.steps}: {steps.filter((s) => !s.disabled).length}/{steps.length}
        </span>
      )}

      {result && !result.error && (
        <>
          <span className="hidden md:inline">
            {t.status.output}: {formatBytes(result.byteLength)}
          </span>
          <span className="ms-auto font-mono">{result.durationMs.toFixed(1)} ms</span>
        </>
      )}

      <span className="ms-auto hidden lg:inline">{t.status.privacy}</span>
    </footer>
  );
}
