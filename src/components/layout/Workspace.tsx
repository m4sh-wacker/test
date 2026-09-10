import { Maximize2, Minimize2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { OperationsPane } from '../panes/OperationsPane';
import { InputPane } from '../panes/InputPane';
import { OutputPane } from '../panes/OutputPane';
import { Pipeline } from '../panes/Pipeline';
import { DetectionSidebar } from '../panes/DetectionSidebar';
import { ActivityBar } from './ActivityBar';
import { EditorTabs } from './EditorTabs';
import { Splitter } from './Splitter';
import { MobileTabs } from './MobileTabs';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { t } from '../../i18n/en';

/**
 * The workbench: activity bar, sidebar, editor groups.
 *
 * The shape is VS Code's, and the reason to borrow it is that the audience
 * already knows it. A pentester reading a payload has an editor open on the
 * other monitor; a layout they can already operate costs them nothing to learn,
 * and the muscle memory — rail to switch panels, tabs to switch buffers, status
 * bar at the bottom for the numbers — transfers intact.
 *
 * The three surfaces map onto editor groups rather than onto panes with
 * titles. Left group holds the recipe. Right group is split horizontally, input
 * over output, which is the arrangement the data itself argues for: what went
 * in sits directly above what came out.
 *
 * Every split is draggable. The illusion is not worth anything if the layout is
 * fixed — resizable groups are half of what makes an editor an editor.
 */
export function Workspace() {
  const paneWidths = useStore((s) => s.paneWidths);
  const setPaneWidth = useStore((s) => s.setPaneWidth);
  const paneHeights = useStore((s) => s.paneHeights);
  const setPaneHeight = useStore((s) => s.setPaneHeight);
  const mobilePane = useStore((s) => s.mobilePane);
  const maximised = useStore((s) => s.outputMaximised);
  const setOutputMaximised = useStore((s) => s.setOutputMaximised);
  const sidebar = useStore((s) => s.sidebar);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);
  const steps = useStore((s) => s.steps);
  const isDesktop = useIsDesktop();

  if (!isDesktop) {
    return (
      /* One surface at a time, from a bottom tab bar. An activity bar plus two
         sidebars plus three editor groups is a desktop shape; on a phone it
         would be six columns of nothing. */
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
      <ActivityBar />

      {sidebarOpen && (
        <>
          <div
            style={{ width: paneWidths.operations }}
            className="flex min-h-0 shrink-0 flex-col bg-surface"
          >
            {sidebar === 'operations' ? <OperationsPane /> : <DetectionSidebar />}
          </div>
          <Splitter
            value={paneWidths.operations}
            min={170}
            max={480}
            label={t.layout.resizeOperations}
            onChange={(w) => setPaneWidth('operations', w)}
          />
        </>
      )}

      {/* The editor area. */}
      <div className="flex min-h-0 min-w-0 flex-1">
        {/* Group 1 — the recipe. */}
        {!maximised && (
          <>
            <div
              style={{ width: paneWidths.recipe }}
              className="flex min-h-0 shrink-0 flex-col bg-bg"
            >
              <EditorTabs
                tabs={[
                  {
                    id: 'recipe',
                    name: 'recipe.yaml',
                    kind: 'yaml',
                    // A recipe with steps in it is a modified buffer, and the
                    // dot is how an editor says so.
                    dirty: steps.length > 0,
                  },
                ]}
                active="recipe"
                onSelect={() => undefined}
              />
              <Pipeline />
            </div>
            <Splitter
              value={paneWidths.recipe}
              min={220}
              max={680}
              label={t.layout.resizeRecipe}
              onChange={(w) => setPaneWidth('recipe', w)}
            />
          </>
        )}

        {/* Group 2 — the data, split horizontally: in over out. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-bg">
          {!maximised && (
            <>
              <div
                className="flex min-h-0 flex-col overflow-hidden"
                style={{ flex: `0 0 ${paneHeights.input}px` }}
              >
                <EditorTabs
                  tabs={[{ id: 'input', name: 'input.txt', kind: 'txt' }]}
                  active="input"
                  onSelect={() => undefined}
                />
                <InputPane />
              </div>
              <Splitter
                axis="vertical"
                value={paneHeights.input}
                min={90}
                max={760}
                label={t.layout.resizeInput}
                onChange={(height) => setPaneHeight('input', height)}
              />
            </>
          )}

          <div className="flex min-h-0 flex-1 basis-0 flex-col">
            <EditorTabs
              tabs={[{ id: 'output', name: 'output.hex', kind: 'hex' }]}
              active="output"
              onSelect={() => undefined}
              actions={
                <button
                  type="button"
                  onClick={() => setOutputMaximised(!maximised)}
                  aria-label={maximised ? t.layout.restore : t.layout.maximiseOutput}
                  title={maximised ? t.layout.restore : t.layout.maximiseOutput}
                  aria-pressed={maximised}
                  className="grid h-6 w-6 place-items-center rounded-sm text-faint transition-colors hover:bg-surface-3 hover:text-text"
                >
                  {maximised ? (
                    <Minimize2 size={13} aria-hidden="true" />
                  ) : (
                    <Maximize2 size={13} aria-hidden="true" />
                  )}
                </button>
              }
            />
            <OutputPane />
          </div>
        </div>
      </div>

      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label={t.layout.showOperations}
          title={t.layout.showOperations}
          className="sr-only"
        >
          {t.layout.showOperations}
        </button>
      )}
    </div>
  );
}
