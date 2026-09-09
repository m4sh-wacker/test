import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export function useHotkeys() {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const state = useStore.getState();
      const mod = event.ctrlKey || event.metaKey;

      if (event.key === 'Escape') {
        // A dialog handles its own Escape and stops propagation, so reaching
        // here means nothing is open and Escape should close the reasoning.
        if (state.whyOpen) state.toggleWhy();
        return;
      }

      if (!mod) return;

      switch (event.key.toLowerCase()) {
        case 'enter': {
          event.preventDefault();
          void state.runRecipe();
          return;
        }
        case 'c': {
          if (!event.shiftKey) return;
          const active = state.chain.find((l) => l.id === state.activeLayerId);
          const output =
            state.steps.length > 0 ? (state.bakeResult?.output ?? '') : (active?.output ?? '');
          if (!output) return;
          event.preventDefault();
          void navigator.clipboard.writeText(output).catch(() => undefined);
          return;
        }
        case 'k': {
          event.preventDefault();
          const search = document.querySelector<HTMLInputElement>('input[type="search"]');
          search?.focus();
          search?.select();
          return;
        }
        case 's': {
          event.preventDefault();
          state.setDialog('library');
          return;
        }
        case 'l': {
          event.preventDefault();
          state.setDialog('share');
          return;
        }
        default:
          return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
