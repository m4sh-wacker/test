import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { OperationsPane } from '../panes/OperationsPane';
import { InputPane } from '../panes/InputPane';
import { OutputPane } from '../panes/OutputPane';
import { Pipeline } from '../panes/Pipeline';
import { Splitter } from './Splitter';
import { MobileTabs } from './MobileTabs';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { t } from '../../i18n/en';

/**
 * Three columns: catalogue, recipe, data.
 *
 * The previous layout put the recipe *between* the input and the output, in the
 * order the bytes travel. That reads beautifully and works badly once a recipe
 * has more than about four steps: the recipe was a horizontal strip of fixed
 * height, so it either squeezed the data or scrolled sideways, and the two
 * things you compare most — what went in and what came out — ended up furthest
 * apart with the machinery between them.
 *
 * Side by side, the recipe gets a full-height column to grow down into, and
 * input sits directly above output where comparing them is a glance rather than
 * a scroll. Every edge is still draggable, so the split is the reader's to set.
 */
export function Workspace() {
  const paneWidths = useStore((s) => s.paneWidths);
  const setPaneWidth = useStore((s) => s.setPaneWidth);
  const paneHeights = useStore((s) => s.paneHeights);
  const setPaneHeight = useStore((s) => s.setPaneHeight);
  const mobilePane = useStore((s) => s.mobilePane);
  const maximised = useStore((s) => s.outputMaximised);
  const railOpen = useStore((s) => s.railOpen);
  const setRailOpen = useStore((s) => s.setRailOpen);
  const isDesktop = useIsDesktop();

  if (!isDesktop) {
    return (
      /* One surface at a time, from a bottom tab bar. Three columns is a
         desktop shape; on a phone it would be three columns of nothing. */
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col">
          {mobilePane === 'operations' && <OperationsPane />}
          {mobilePane === 'recipe' && <Pipeline />}
          {mobilePane === 'input' && <InputPane />}
          {mobilePane === 'output' && <OutputPane />}
        </div>
        <MobileTabs />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      {/* Column 1 — the catalogue. */}
      {railOpen ? (
        <>
          <div style={{ width: paneWidths.operations }} className="flex min-h-0 shrink-0">
            <OperationsPane />
          </div>
          <Splitter
            value={paneWidths.operations}
            min={180}
            max={420}
            label={t.layout.resizeOperations}
            onChange={(w) => setPaneWidth('operations', w)}
          />
        </>
      ) : (
        <div className="flex shrink-0 flex-col border-e border-line bg-surface">
          <button
            type="button"
            onClick={() => setRailOpen(true)}
            aria-label={t.layout.showOperations}
            title={t.layout.showOperations}
            className="grid h-8 w-8 place-items-center text-muted transition-colors hover:bg-surface-3 hover:text-text"
          >
            <PanelLeftOpen size={15} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Column 2 — the recipe, with room to grow downward. */}
      {!maximised && (
        <>
          <div style={{ width: paneWidths.recipe }} className="flex min-h-0 shrink-0">
            <Pipeline />
          </div>
          <Splitter
            value={paneWidths.recipe}
            min={220}
            max={640}
            label={t.layout.resizeRecipe}
            onChange={(w) => setPaneWidth('recipe', w)}
          />
        </>
      )}

      {/* Column 3 — the data, in over out. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!maximised && (
          <>
            <div
              className="flex min-h-0 overflow-hidden"
              style={{ flex: `0 0 ${paneHeights.input}px` }}
            >
              <InputPane />
            </div>
            <Splitter
              axis="vertical"
              value={paneHeights.input}
              min={80}
              max={720}
              label={t.layout.resizeInput}
              onChange={(height) => setPaneHeight('input', height)}
            />
          </>
        )}
        <div className="flex min-h-0 flex-1 basis-0">
          <OutputPane />
        </div>
      </div>
    </div>
  );
}

/** Lives here because only the workspace has an operations rail to collapse. */
export function RailToggle() {
  const railOpen = useStore((s) => s.railOpen);
  const setRailOpen = useStore((s) => s.setRailOpen);

  return (
    <button
      type="button"
      onClick={() => setRailOpen(!railOpen)}
      aria-label={railOpen ? t.layout.hideOperations : t.layout.showOperations}
      title={railOpen ? t.layout.hideOperations : t.layout.showOperations}
      aria-pressed={!railOpen}
      className="inline-grid h-8 w-8 place-items-center rounded-control text-muted transition-colors duration-150 ease-smooth hover:bg-surface-3 hover:text-text max-md:hidden"
    >
      {railOpen ? (
        <PanelLeftClose size={15} aria-hidden="true" />
      ) : (
        <PanelLeftOpen size={15} aria-hidden="true" />
      )}
    </button>
  );
}
