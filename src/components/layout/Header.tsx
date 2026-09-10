import { Download, Github, Keyboard, Link2, Moon, Save, Search, Sun, Wrench } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { t } from '../../i18n/en';
import { IconButton } from '../ui/primitives';
import { cx } from '../ui/helpers';
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
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const flagCount = useStore((s) => s.ctf?.flags.length ?? 0);

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

      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-line bg-surface px-3 sm:gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Logomark />

          {/*
            Two lines, because the affiliation is a fact about the project and
            not a subtitle for the tool. Stacked under the name it reads in the
            same glance; beside it, it read as marketing. The strapline only
            claims what is true — an OWASP Foundation project, Apache-2.0 — and
            never "official", which is a status this does not have.
          */}
          <span className="flex min-w-0 flex-col justify-center leading-none">
            <span className="truncate font-brand text-[0.8125rem] font-semibold tracking-tight sm:text-[0.9375rem]">
              <span style={{ color: 'var(--purple-text)' }}>OWASP</span>
              <span className="ms-1.5 text-text">DecodeBox</span>
            </span>
            <span className="mt-[3px] hidden truncate text-[10px] leading-none text-faint lg:inline">
              {t.app.affiliation}
            </span>
          </span>

          <span
            aria-hidden="true"
            className="mx-1 hidden h-5 w-px bg-line xl:block"
          />
          <span className="hidden text-micro text-faint xl:inline">{t.app.tagline}</span>

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
            Two modes: transform it, or work out what it is.

            The Report switch also sat here and is out for now — the view, its
            engine and its tests are all still in the tree and `view` still
            drives which one renders, so bringing it back is one more button.
          */}
          <div className="me-1 flex items-center rounded-control border border-line p-0.5">
            <button
              type="button"
              onClick={() => setView('workspace')}
              aria-pressed={view === 'workspace'}
              className={cx(
                'flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-micro font-medium transition-colors',
                view === 'workspace' ? 'bg-surface-3 text-text' : 'text-faint hover:text-muted',
              )}
            >
              <Wrench size={12} aria-hidden="true" />
              <span className="max-sm:hidden">{t.header.workspace}</span>
            </button>
            <button
              type="button"
              onClick={() => setView('ctf')}
              aria-pressed={view === 'ctf'}
              title={t.header.ctf}
              className={cx(
                'flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-micro font-medium transition-colors',
                view === 'ctf' ? 'bg-surface-3 text-text' : 'text-faint hover:text-muted',
              )}
            >
              <Search size={12} aria-hidden="true" />
              <span className="max-sm:hidden">{t.ctf.tab}</span>
              {flagCount > 0 && (
                <span
                  className="rounded-full px-1.5 font-mono text-[10px] text-bg"
                  style={{ backgroundColor: 'var(--green)' }}
                >
                  {flagCount}
                </span>
              )}
            </button>
          </div>

          {/*
            Six icons in a row, previously in the order they happened to be
            written: the pane toggle sat with nothing, and Share, theme and
            GitHub ran together as one undifferentiated strip.
            They group into three things a person actually distinguishes —
            what to do with this recipe, how to arrange the window, where to
            get help — and the rules make the grouping visible instead of
            decorative. Each keeps its label for a screen reader and its
            tooltip for everyone else; at this density, six words across the
            top would cost more than the icons do.
          */}
          <span aria-hidden="true" className="mx-1 h-4 w-px bg-line max-sm:hidden" />

          <span role="group" aria-label={t.header.recipeActions} className="flex items-center gap-0.5">
            <IconButton label={t.header.share} onClick={() => setDialog('share')}>
              <Link2 size={15} aria-hidden="true" />
            </IconButton>
            <IconButton label={t.header.library} onClick={() => setDialog('library')}>
              <Save size={15} aria-hidden="true" />
            </IconButton>
          </span>

          <span aria-hidden="true" className="mx-1 h-4 w-px bg-line max-sm:hidden" />

          <span role="group" aria-label={t.header.viewActions} className="flex items-center gap-0.5">
            <RailToggle />
            <IconButton label={t.header.theme} onClick={() => setTheme(isDark ? 'light' : 'dark')}>
              {isDark ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
            </IconButton>
          </span>

          <span aria-hidden="true" className="mx-1 h-4 w-px bg-line max-sm:hidden" />

          <span role="group" aria-label={t.header.helpActions} className="flex items-center gap-0.5">
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
          </span>
        </div>
      </header>
    </>
  );
}
