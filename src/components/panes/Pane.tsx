import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cx } from '../ui/helpers';

interface Props {
  title: string;
  /**
   * Position in the input → recipe → output flow, 1-based.
   *
   * Three panes with identically weighted headers read as three unrelated
   * boxes, and the one thing a first-time visitor needs to know is that the
   * bytes travel through them in order. A number says that in one character.
   * Panes that are not stages of the flow — the operations catalogue — leave it
   * unset and get no badge.
   */
  step?: number;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * The shared frame every editor group sits in: a breadcrumb strip over a
 * scrolling body.
 *
 * This was a nine-pixel-taller header carrying a numbered badge and the pane
 * name in purple caps. Under an editor tab that already says `input.txt`, the
 * name was printed twice and the second one was the louder of the two. VS Code
 * solves this with breadcrumbs — a quiet path under the tab, giving location
 * rather than repeating identity — so that is what this is now.
 *
 * The badge went with it. It existed to say the bytes travel input → recipe →
 * output, which the three-group layout now says by arrangement.
 */
export function Pane({ title, step, meta, actions, children, className }: Props) {
  return (
    <section
      aria-label={title}
      className={cx('flex min-h-0 min-w-0 flex-1 flex-col bg-bg', className)}
    >
      <div className="flex h-[24px] shrink-0 items-center justify-between gap-2 px-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <h2 className="flex items-center gap-1.5 text-[11px] leading-none text-faint">
            {step !== undefined && (
              <>
                <span className="tabular-nums">{step}</span>
                <ChevronRight size={11} aria-hidden="true" className="opacity-60" />
              </>
            )}
            <span className="truncate">{title}</span>
          </h2>
          {meta}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-0.5">{actions}</div>}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </section>
  );
}

/**
 * Hidden from assistive technology on purpose. The order is already carried by
 * the document: the panes come in flow order and each is a landmark with its
 * own name, so a screen reader announces "Input", "Recipe", "Output" in
 * sequence without help. Reading "1" before each one adds nothing but noise.
 */
export function StepBadge({ step }: { step: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] font-mono text-[11px] font-semibold leading-none"
      style={{ backgroundColor: 'var(--purple-soft)', color: 'var(--purple-text)' }}
    >
      {step}
    </span>
  );
}
