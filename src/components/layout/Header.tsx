import { Download, Github, Keyboard, Moon, Search, Sun } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { t } from '../../i18n/en';
import { cx } from '../ui/helpers';

/**
 * The title bar.
 *
 * Thirty-five pixels, the height VS Code gives its own, with the three regions
 * an editor title bar has: identity on the left, the command centre in the
 * middle, window-level controls on the right.
 *
 * It used to be a forty-eight pixel web header with a brand rule above it, a
 * two-line wordmark, a strapline, a segmented view switch and eight icons. All
 * of that is real information, but a title bar spending fifty-one pixels of a
 * laptop screen on identity is fifty-one pixels not spent on the payload. The
 * view switch moved to the activity bar, where switching views now lives; the
 * affiliation moved to the download dialog and the README, which is where
 * someone actually looks for provenance.
 */

/**
 * The mark is a filled hexagon rather than an outline. OWASP's own identity is
 * built on a solid form, and an outline at this size reads as a wireframe icon
 * rather than a logo.
 */
function Logomark() {
  return (
    <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <path d="M16 3 27 9.5v13L16 29 5 22.5v-13z" fill="var(--purple)" />
      <path
        d="M12.6 12.8 9 16l3.6 3.2M19.4 12.8 23 16l-3.6 3.2"
        fill="none"
        stroke="var(--activity-bg)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TitleButton({
  label,
  onClick,
  href,
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
}) {
  const className =
    'inline-grid h-[26px] w-[26px] place-items-center rounded-sm text-muted transition-colors duration-100 hover:bg-surface-3 hover:text-text';

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={label}
        title={label}
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={className}>
      {children}
    </button>
  );
}

export function Header() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const setDialog = useStore((s) => s.setDialog);
  const focusSearch = useStore((s) => s.focusSearch);
  const steps = useStore((s) => s.steps);

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <header className="flex h-[35px] shrink-0 items-center gap-2 border-b border-line bg-surface-2 px-2">
      <div className="flex shrink-0 items-center gap-1.5">
        <Logomark />
        <span className="truncate font-sans text-[12px] leading-none">
          <span style={{ color: 'var(--purple-text)' }}>OWASP</span>
          <span className="ms-1 text-text">DecodeBox</span>
        </span>
      </div>

      {/*
        The command centre. In VS Code this is the window title turned into a
        control, and it is the only affordance in the title bar that is worth
        the width: it says what you are working on and it is the way in to
        finding something. Ours says how many steps the recipe has, and opens
        the operation search.
      */}
      <button
        type="button"
        onClick={focusSearch}
        className={cx(
          'mx-auto hidden h-[22px] w-full max-w-[420px] items-center justify-center gap-2',
          'rounded-[5px] border border-line bg-surface text-[11px] text-faint',
          'transition-colors duration-100 hover:bg-surface-3 hover:text-muted sm:flex',
        )}
      >
        <Search size={11} aria-hidden="true" />
        <span className="truncate">
          {steps.length === 0 ? t.header.commandEmpty : t.header.commandSteps(steps.length)}
        </span>
        <kbd className="ms-1 rounded-sm border border-line px-1 font-mono text-[10px] leading-[14px]">
          {t.operations.shortcut}
        </kbd>
      </button>

      <div className="ms-auto flex shrink-0 items-center gap-0.5 sm:ms-0">
        <TitleButton label={t.header.download} onClick={() => setDialog('download')}>
          <Download size={14} aria-hidden="true" />
        </TitleButton>
        <TitleButton
          label={t.header.theme}
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
        >
          {isDark ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
        </TitleButton>
        <TitleButton label={t.header.help} onClick={() => setDialog('help')}>
          <Keyboard size={14} aria-hidden="true" />
        </TitleButton>
        <TitleButton label={t.header.github} href="https://github.com/OWASP/DecodeBox">
          <Github size={14} aria-hidden="true" />
        </TitleButton>
      </div>
    </header>
  );
}
