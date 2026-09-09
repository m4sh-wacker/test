import { useCallback, useRef } from 'react';
import { cx } from '../ui/helpers';

interface Props {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (width: number) => void;
}

/**
 * A draggable pane divider that is also operable from the keyboard. Resizing a
 * workspace with a mouse only is a common accessibility gap in tools like this
 * one, and it costs almost nothing to avoid.
 */
export function Splitter({ value, min, max, label, onChange }: Props) {
  const dragging = useRef(false);

  const clamp = useCallback(
    (width: number) => Math.min(max, Math.max(min, width)),
    [min, max],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    const startX = event.clientX;
    const startWidth = value;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const onMove = (move: PointerEvent) => {
      if (!dragging.current) return;
      // Logical direction: in RTL the pane grows as the pointer moves the other way.
      const rtl = document.documentElement.dir === 'rtl';
      const delta = (move.clientX - startX) * (rtl ? -1 : 1);
      onChange(clamp(startWidth + delta));
    };

    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 64 : 16;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onChange(clamp(value - step));
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      onChange(clamp(value + step));
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={cx(
        'group relative w-px shrink-0 cursor-col-resize bg-line',
        'transition-colors duration-150 ease-smooth hover:bg-purple-line focus-visible:bg-purple',
      )}
    >
      {/* A one-pixel line is an unfair click target; widen the hit area only. */}
      <span aria-hidden="true" className="absolute inset-y-0 -inset-x-1.5" />
    </div>
  );
}
