import { useRef, useState } from 'react';
import {
  ChevronDown,
  Circle,
  Eye,
  EyeOff,
  GripVertical,
  Play,
  Plus,
  SkipForward,
  Trash2,
  X,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { t } from '../../i18n/en';
import { cx } from '../ui/helpers';
import { ArgControl } from './ArgControls';
import { StepBadge } from './Pane';

/**
 * The recipe, as a vertical stack of blocks.
 *
 * It was a horizontal run of chips, with the settings for whichever one you had
 * selected in a panel underneath. That reads well and works badly: the chips
 * ran off the side of the pane, only one step's settings existed at a time, and
 * comparing two steps meant clicking between them. A twelve-step recipe was
 * unusable, which is the length at which a recipe starts being worth saving.
 *
 * Vertically, every step is a block that owns its own settings. Nothing hides
 * behind a selection, the order is the order you read in, and the list grows
 * downward into a column that scrolls — which is what a recipe of any real
 * length needs.
 */

const OP_MIME = 'application/x-decodebox-op';

/** Whether a drag is carrying an operation, readable during dragover. */
function carriesOperation(event: React.DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes(OP_MIME);
}

/** The seam between two blocks, and the target for dropping between them. */
function DropSlot({
  index,
  active,
  onEnter,
  onDrop,
}: {
  index: number;
  active: boolean;
  onEnter: (index: number) => void;
  onDrop: (event: React.DragEvent, index: number) => void;
}) {
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        onEnter(index);
      }}
      onDrop={(event) => onDrop(event, index)}
      className="relative h-2 shrink-0"
    >
      <span
        aria-hidden="true"
        className={cx(
          'absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full transition-colors duration-100',
          active ? 'bg-purple' : 'bg-transparent',
        )}
      />
    </div>
  );
}

function Block({
  index,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  index: number;
  dragging: boolean;
  onDragStart: (uid: string) => void;
  onDragEnd: (dropEffect: string) => void;
}) {
  const step = useStore((s) => s.steps[index]);
  const operations = useStore((s) => s.operations);
  const breakpoints = useStore((s) => s.breakpoints);
  const pausedAt = useStore((s) => s.pausedAt);
  const error = useStore((s) => s.bakeResult?.error);
  const removeStep = useStore((s) => s.removeStep);
  const toggleStep = useStore((s) => s.toggleStep);
  const toggleBreakpoint = useStore((s) => s.toggleBreakpoint);
  const updateArg = useStore((s) => s.updateArg);

  // Open by default: the settings are the reason the block exists. Collapsing
  // is for getting a long recipe back onto one screen, not the resting state.
  const [open, setOpen] = useState(true);

  if (!step) return null;
  const op = operations.find((o) => o.id === step.opId);
  const hasBreak = breakpoints.includes(step.uid);
  const failed = error?.stepIndex === index;
  const paused = pausedAt === index;

  return (
    <section
      aria-label={op?.name ?? step.opId}
      className={cx(
        'shrink-0 rounded-control border bg-surface transition-opacity',
        dragging && 'opacity-30',
        step.disabled && 'opacity-50',
        failed ? 'border-danger' : paused ? 'border-purple-line' : 'border-line',
      )}
    >
      <header className="flex items-center gap-1 py-1 pe-1 ps-1">
        <span
          aria-hidden="true"
          draggable
          onDragStart={(event) => {
            onDragStart(step.uid);
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', step.uid);
          }}
          onDragEnd={(event) => onDragEnd(event.dataTransfer.dropEffect)}
          title={t.recipe.drag}
          className="flex w-4 shrink-0 cursor-grab items-center justify-center text-faint transition-colors hover:text-muted active:cursor-grabbing"
        >
          <GripVertical size={12} />
        </span>

        <button
          type="button"
          onClick={() => toggleBreakpoint(step.uid)}
          aria-label={hasBreak ? t.recipe.clearBreakpoint : t.recipe.setBreakpoint}
          aria-pressed={hasBreak}
          title={hasBreak ? t.recipe.clearBreakpoint : t.recipe.setBreakpoint}
          className="grid h-5 w-5 shrink-0 place-items-center rounded"
        >
          <Circle
            size={8}
            aria-hidden="true"
            style={
              hasBreak
                ? { fill: 'var(--amber)', color: 'var(--amber)' }
                : paused
                  ? { fill: 'var(--purple)', color: 'var(--purple-text)' }
                  : { color: 'var(--text-faint)' }
            }
          />
        </button>

        <span className="w-4 shrink-0 text-end font-mono text-[10px] tabular-nums text-faint">
          {index + 1}
        </span>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          title={op?.description}
          className="flex min-w-0 flex-1 items-center gap-1 rounded px-1 py-0.5 text-start"
        >
          <span
            className={cx(
              'truncate font-mono text-xs2',
              step.disabled ? 'text-faint line-through' : 'text-text',
            )}
          >
            {op?.name ?? step.opId}
          </span>
          {step.args.length > 0 && (
            <ChevronDown
              size={11}
              aria-hidden="true"
              className={cx(
                'shrink-0 text-faint transition-transform duration-150',
                open && 'rotate-180',
              )}
            />
          )}
        </button>

        <button
          type="button"
          onClick={() => toggleStep(step.uid)}
          aria-label={step.disabled ? t.recipe.enable : t.recipe.disable}
          title={step.disabled ? t.recipe.enable : t.recipe.disable}
          className="grid h-6 w-6 shrink-0 place-items-center rounded text-faint transition-colors hover:bg-surface-3 hover:text-text"
        >
          {step.disabled ? (
            <EyeOff size={12} aria-hidden="true" />
          ) : (
            <Eye size={12} aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          onClick={() => removeStep(step.uid)}
          aria-label={t.recipe.remove}
          title={t.recipe.remove}
          className="grid h-6 w-6 shrink-0 place-items-center rounded text-faint transition-colors hover:bg-surface-3 hover:text-danger"
        >
          <X size={12} aria-hidden="true" />
        </button>
      </header>

      {open && step.args.length > 0 && (
        <div className="grid gap-1.5 border-t border-line px-2 py-1.5">
          {step.args.map((arg) => (
            <ArgControl
              key={arg.name}
              stepUid={step.uid}
              arg={arg}
              onChange={(patch) => updateArg(step.uid, arg.name, patch)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function Pipeline() {
  const steps = useStore((s) => s.steps);
  const removeStepFromRecipe = useStore((s) => s.removeStep);
  const result = useStore((s) => s.bakeResult);
  const autoBake = useStore((s) => s.autoBake);
  const baking = useStore((s) => s.baking);
  const pausedAt = useStore((s) => s.pausedAt);
  const addStep = useStore((s) => s.addStep);
  const reorderStep = useStore((s) => s.reorderStep);
  const setAutoBake = useStore((s) => s.setAutoBake);
  const runRecipe = useStore((s) => s.runRecipe);
  const stepOnce = useStore((s) => s.stepOnce);
  const clearRecipe = useStore((s) => s.clearRecipe);
  const focusSearch = useStore((s) => s.focusSearch);

  const [draggingUid, setDraggingUid] = useState<string | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [dropping, setDropping] = useState(false);

  /*
   * Escape during a drag means cancel, not delete.
   *
   * The browser reports a cancelled drag and a drag released over nothing
   * identically — `dropEffect` is 'none' for both — so without this, backing
   * out of a drag would silently delete the step you were trying to keep.
   */
  const cancelled = useRef(false);
  const watchEscape = useRef<((event: KeyboardEvent) => void) | null>(null);

  const paused = pausedAt !== null;
  const empty = steps.length === 0;
  // Dragging a step, currently outside the pane: releasing here removes it.
  const removing = draggingUid !== null && !dropping;

  const startStepDrag = (uid: string) => {
    setDraggingUid(uid);
    cancelled.current = false;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancelled.current = true;
    };
    watchEscape.current = onKey;
    window.addEventListener('keydown', onKey);
  };

  const endStepDrag = (dropEffect: string) => {
    if (watchEscape.current) {
      window.removeEventListener('keydown', watchEscape.current);
      watchEscape.current = null;
    }
    if (draggingUid && dropEffect === 'none' && !cancelled.current) {
      removeStepFromRecipe(draggingUid);
    }
    setDraggingUid(null);
    setSlot(null);
    setDropping(false);
  };

  const onDrop = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    const opId = event.dataTransfer.getData(OP_MIME);
    if (opId) addStep(opId, index);
    else if (draggingUid) reorderStep(draggingUid, index);
    setDraggingUid(null);
    setSlot(null);
    setDropping(false);
  };

  return (
    <section
      aria-label={t.recipe.title}
      onDragOver={(event) => {
        if (!carriesOperation(event) && draggingUid === null) return;
        event.preventDefault();
        setDropping(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setDropping(false);
        setSlot(null);
      }}
      onDrop={(event) => onDrop(event, steps.length)}
      className={cx(
        'flex min-h-0 min-w-0 flex-1 flex-col bg-bg transition-colors duration-150',
        dropping && 'bg-purple-wash',
      )}
    >
      <header className="flex h-8 shrink-0 items-center gap-2 border-b border-line bg-surface px-2">
        <StepBadge step={2} />
        <h2
          className="font-mono text-xs2 font-semibold uppercase tracking-[0.08em]"
          style={{ color: 'var(--purple-text)' }}
        >
          {t.recipe.title}
        </h2>
        <span className="font-mono text-micro tabular-nums text-faint">{steps.length}</span>
        {paused && (
          <span className="font-mono text-micro" style={{ color: 'var(--amber)' }}>
            {t.recipe.pausedAt(pausedAt + 1)}
          </span>
        )}

        <span className="ms-auto flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => void stepOnce()}
            disabled={!paused}
            aria-label={t.recipe.step}
            title={t.recipe.step}
            className="grid h-6 w-6 place-items-center rounded text-faint transition-colors hover:bg-surface-3 hover:text-text disabled:opacity-30"
          >
            <SkipForward size={12} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={clearRecipe}
            disabled={empty}
            aria-label={t.recipe.clear}
            title={t.recipe.clear}
            className="grid h-6 w-6 place-items-center rounded text-faint transition-colors hover:bg-surface-3 hover:text-danger disabled:opacity-30"
          >
            <Trash2 size={12} aria-hidden="true" />
          </button>
        </span>
      </header>

      {removing && (
        <p
          role="status"
          className="flex shrink-0 items-center gap-1.5 border-b border-line px-2 py-1 text-micro font-medium"
          style={{ color: 'var(--red)', backgroundColor: 'var(--amber-wash)' }}
        >
          <Trash2 size={11} aria-hidden="true" />
          {t.recipe.dropToRemove}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
        <DropSlot index={0} active={slot === 0} onEnter={setSlot} onDrop={onDrop} />

        {steps.map((step, index) => (
          <div key={step.uid}>
            <Block
              index={index}
              dragging={draggingUid === step.uid}
              onDragStart={startStepDrag}
              onDragEnd={endStepDrag}
            />
            <DropSlot
              index={index + 1}
              active={slot === index + 1}
              onEnter={setSlot}
              onDrop={onDrop}
            />
          </div>
        ))}

        <button
          type="button"
          onClick={focusSearch}
          onDragOver={(event) => {
            event.preventDefault();
            setSlot(steps.length);
          }}
          onDrop={(event) => onDrop(event, steps.length)}
          className={cx(
            'flex w-full items-center justify-center gap-1.5 rounded-control border border-dashed py-2',
            'text-micro transition-colors duration-150 ease-smooth',
            slot === steps.length
              ? 'border-purple bg-purple-soft text-text'
              : 'border-line text-faint hover:border-purple-line hover:text-text',
          )}
        >
          <Plus size={11} aria-hidden="true" />
          {empty ? t.recipe.addFirst : t.recipe.add}
        </button>
      </div>

      <footer className="flex h-10 shrink-0 items-center gap-2 border-t border-line bg-surface px-2">
        <label
          className="flex cursor-pointer items-center gap-1.5 rounded-control py-1 text-micro text-faint transition-colors hover:text-muted"
          title={t.recipe.autoBakeHint}
        >
          <input
            type="checkbox"
            checked={autoBake}
            onChange={(e) => setAutoBake(e.target.checked)}
            className="h-3 w-3 accent-[var(--purple)]"
          />
          {autoBake ? t.recipe.autoBaking : t.recipe.autoBake}
        </label>

        {result && !result.error && (
          <span className="font-mono text-micro tabular-nums text-faint">
            {result.durationMs.toFixed(1)} ms
          </span>
        )}

        <button
          type="button"
          onClick={() => void runRecipe()}
          disabled={empty}
          className={cx(
            'ms-auto flex items-center gap-1.5 rounded-control px-3 py-1.5 text-xs2 font-semibold',
            'transition-colors duration-150 ease-smooth',
            empty || autoBake
              ? 'border border-line text-muted hover:border-line-strong hover:bg-surface-3'
              : 'bg-purple text-white hover:brightness-110',
          )}
        >
          <Play size={12} aria-hidden="true" />
          {baking ? t.recipe.baking : autoBake && !empty ? t.recipe.rerun : t.recipe.bake}
        </button>
      </footer>
    </section>
  );
}
