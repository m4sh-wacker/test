import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { OperationsPane } from '../panes/OperationsPane';
import { InputPane } from '../panes/InputPane';
import { OutputPane } from '../panes/OutputPane';
import { Pipeline } from '../panes/Pipeline';
import { Splitter } from './Splitter';
import { MobileTabs } from './MobileTabs';
import { t } from '../../i18n/en';

/**
 * Two columns, not four panes.
 *
 * Tools in this space conventionally put operations, recipe, input and output
 * side by side, which makes the recipe a column that happens to sit near the
 * data rather than something the data passes through. Here the right-hand
 * column is the flow itself — input, then the pipeline, then output, top to
 * bottom in the order the bytes travel — and the operations catalogue is a
 * single rail beside it that can be closed when it is not needed.
 *
 * The result reads as one workspace rather than four, and the pipeline ends up
 * drawn in the same language as the detected layer chain, which is the point.
 */
export function Workspace() {
  const paneWidths = useStore((s) => s.paneWidths);
  const setPaneWidth = useStore((s) => s.setPaneWidth);
  const mobilePane = useStore((s) => s.mobilePane);
  const maximised = useStore((s) => s.outputMaximised);
  const railOpen = useStore((s) => s.railOpen);
  const setRailOpen = useStore((s) => s.setRailOpen);

  return (
    <>
      <div className="hidden min-h-0 flex-1 md:flex">
        {railOpen ? (
          <>
            <div style={{ width: paneWidths.operations }} className="flex min-h-0 shrink-0">
              <OperationsPane />
            </div>
            <Splitter
              value={paneWidths.operations}
              min={200}
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
              className="grid h-9 w-9 place-items-center text-muted transition-colors hover:bg-surface-3 hover:text-text"
            >
              <PanelLeftOpen size={15} aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {!maximised && (
            <div className="flex min-h-0 flex-1 basis-0">
              <InputPane />
            </div>
          )}
          <Pipeline />
          <div className={maximised ? 'flex min-h-0 flex-1' : 'flex min-h-0 flex-[1.25] basis-0'}>
            <OutputPane />
          </div>
        </div>
      </div>

      {/* Mobile: one surface at a time, chosen from a bottom tab bar. The
          wrapper carries flex-1, because a pane sizes itself to its container. */}
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <div className="flex min-h-0 flex-1 flex-col">
          {mobilePane === 'operations' && <OperationsPane />}
          {mobilePane === 'recipe' && (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <Pipeline />
              <p className="px-3 py-6 text-center text-micro text-faint">{t.recipe.mobileHint}</p>
            </div>
          )}
          {mobilePane === 'input' && <InputPane />}
          {mobilePane === 'output' && <OutputPane />}
        </div>
        <MobileTabs />
      </div>
    </>
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
