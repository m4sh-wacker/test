import { useSyncExternalStore } from 'react';

/**
 * Whether a CSS media query currently matches.
 *
 * The workspace used to render both its layouts and hide one with `md:hidden`,
 * which hides pixels and nothing else: every pane was mounted twice, the store
 * had two of every subscription, and a screen reader announced two inputs and
 * two outputs. The interface has to know which layout it is in, not merely
 * paint one of them.
 *
 * `useSyncExternalStore` rather than an effect, so the first render already has
 * the right answer and there is no flash of the wrong layout.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    // Server-rendered HTML has no viewport to measure. There is no server here,
    // but the signature wants an answer and desktop is the safer guess.
    () => true,
  );
}

/** The one breakpoint the workspace changes shape at, matching Tailwind's `md`. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)');
}
