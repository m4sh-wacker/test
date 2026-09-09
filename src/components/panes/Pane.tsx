import type { ReactNode } from 'react';
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
 * The shared frame every workspace pane sits in: a compact header with a label,
 * optional metadata and actions, over a scrolling body. Keeping the chrome in
 * one place is what stops four panes drifting into four slightly different
 * designs.
 */
export function Pane({ title, step, meta, actions, children, className }: Props) {
  return (
    <section
      aria-label={title}
      className={cx('flex min-h-0 min-w-0 flex-1 flex-col bg-bg', className)}
    >
      <header className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-line bg-surface px-3">
        <div className="flex min-w-0 items-center gap-2">
          {step !== undefined && <StepBadge step={step} />}
          <h2
            className="font-mono text-xs2 font-semibold uppercase tracking-[0.08em]"
            style={{ color: 'var(--purple-text)' }}
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
