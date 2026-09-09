import type { ReactNode } from 'react';
import { cx } from '../ui/helpers';

interface Props {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * The shared frame every workspace pane sits in: a compact header with a label,
 * optional metadata and actions, over a scrolling body. Keeping the chrome in
 * one place is what stops four panes drifting into four slightly different
 * designs.
 */
export function Pane({ title, meta, actions, children, className }: Props) {
  return (
    <section
      aria-label={title}
      className={cx('flex min-h-0 min-w-0 flex-1 flex-col bg-bg', className)}
    >
      <header className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-line bg-surface px-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <h2
            className="font-mono text-micro font-medium uppercase tracking-[0.1em]"
            style={{ color: 'var(--purple)' }}
          >
            {title}
          </h2>
          {meta}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-0.5">{actions}</div>}
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </section>
  );
}
