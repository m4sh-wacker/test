import { Download, Github, Keyboard, Link2, Moon, Save, Sun } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { t } from '../../i18n/en';
import { IconButton } from '../ui/primitives';
import { RailToggle } from './Workspace';

/**
 * The mark is a filled hexagon rather than an outline. OWASP's own identity is
 * built on a solid form, and an outline at 20px reads as a wireframe icon
 * rather than a logo.
 */
function Logomark() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <path d="M16 3 27 9.5v13L16 29 5 22.5v-13z" fill="var(--purple)" />
      <path
        d="M12.6 12.8 9 16l3.6 3.2M19.4 12.8 23 16l-3.6 3.2"
        fill="none"
        stroke="var(--bg)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Header() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const setDialog = useStore((s) => s.setDialog);

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <>
      {/* A brand rule across the top. The one place the accent is unmissable. */}
      <div
        aria-hidden="true"
        className="h-[3px] shrink-0"
        style={{
          background:
            'linear-gradient(90deg, var(--purple) 0%, var(--purple) 42%, var(--purple-line) 78%, transparent 100%)',
        }}
      />

      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="self-center">
            <Logomark />
          </span>
          <span className="truncate font-brand text-[0.9375rem] font-semibold leading-none tracking-tight">
            <span style={{ color: 'var(--purple)' }}>OWASP</span>
            <span className="ms-1.5 text-text">DecodeBox</span>
          </span>
          <span className="hidden text-micro text-faint sm:inline">{t.app.tagline}</span>

          {/* Beside the name rather than in the icon strip on the right. The
              offer is "take this away with you", which belongs with the
              identity of the thing, not among the tools that act on the data. */}
          <button
            type="button"
            onClick={() => setDialog('download')}
            className="ms-2 hidden items-center gap-1.5 self-center rounded-control px-2 py-1 text-micro text-muted transition-colors duration-150 ease-smooth hover:bg-surface-3 hover:text-text sm:inline-flex"
          >
            <Download size={12} aria-hidden="true" />
            {t.header.download}
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {/*
            The Report and CTF mode switches used to sit here. Both features are
            intact — the views, the engine behind them and their tests are all
            still in the tree, and `view` in the store still drives which one
            renders. Only the way in was taken out, because three modes in the
            header made the workspace look like a suite of tools when almost
            everybody wants the one. Putting them back is this block again.
          */}
          <RailToggle />

          <span aria-hidden="true" className="mx-1 h-4 w-px bg-line" />

          <IconButton label={t.header.share} onClick={() => setDialog('share')}>
            <Link2 size={15} aria-hidden="true" />
          </IconButton>

          <IconButton label={t.header.library} onClick={() => setDialog('library')}>
            <Save size={15} aria-hidden="true" />
          </IconButton>

          <span aria-hidden="true" className="mx-1 h-4 w-px bg-line" />

          <IconButton label={t.header.theme} onClick={() => setTheme(isDark ? 'light' : 'dark')}>
            {isDark ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
          </IconButton>

          <IconButton label={t.header.help} onClick={() => setDialog('help')} className="max-sm:hidden">
            <Keyboard size={15} aria-hidden="true" />
          </IconButton>

          <a
            href="https://github.com/OWASP/DecodeBox"
            target="_blank"
            rel="noreferrer noopener"
            aria-label={t.header.github}
            title={t.header.github}
            className="inline-grid h-8 w-8 place-items-center rounded-control text-muted transition-colors duration-150 ease-smooth hover:bg-surface-3 hover:text-text max-sm:hidden"
          >
            <Github size={15} aria-hidden="true" />
          </a>
        </div>
      </header>
    </>
  );
}
