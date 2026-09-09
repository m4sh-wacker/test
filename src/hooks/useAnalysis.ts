import { useEffect } from 'react';
import { useStore } from '../store/useStore';

/** Debounce so work runs when typing pauses, not on every keystroke. */
const DEBOUNCE_MS = 220;

/**
 * Keeps both halves of the workspace current as the input changes: detection
 * re-runs, and so does the recipe when auto-bake is on.
 *
 * Re-baking has to be here rather than in `setInput`, because every path that
 * changes the input — typing, a sample, a dropped file, output-to-input —
 * should behave the same. Leaving it out was a real bug: with a recipe already
 * built, a new input left the previous result on screen looking current.
 */
export function useAnalysis() {
  const input = useStore((s) => s.input);
  const autoBake = useStore((s) => s.autoBake);
  const view = useStore((s) => s.view);
  const analyse = useStore((s) => s.analyse);
  const runRecipe = useStore((s) => s.runRecipe);
  const runCtf = useStore((s) => s.runCtf);

  useEffect(() => {
    if (input.trim().length === 0) return;

    const timer = setTimeout(() => {
      void analyse();
      if (autoBake) void runRecipe();
      // CTF mode recovers cipher keys by search, so it only keeps itself
      // current while somebody is actually looking at it.
      if (view === 'ctf') void runCtf();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [input, autoBake, view, analyse, runRecipe, runCtf]);
}
