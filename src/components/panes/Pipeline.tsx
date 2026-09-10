import { useRef, useState } from 'react';
import { Circle, Eye, EyeOff, GripVertical, Play, Plus, SkipForward, Trash2, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { t } from '../../i18n/en';
import { cx } from '../ui/helpers';
import { ArgControl } from './ArgControls';
import { StepBadge } from './Pane';

/**
 * The recipe, drawn as the flow it actually is.
 *
 * A transformation chain is a pipeline from input to output, and drawing it as
 * one puts it where it belongs — between the two things it connects — instead
 * of in a column beside them. It also means the recipe and the detected layer
 * chain share a visual language: both are a run of connected nodes with the
 * same shape, so what the tool found and what the user built read as the same
 * kind of thing.
 *
 * The cost is that arguments no longer fit inside a node, which is why there is
 * an inspector underneath for whichever step is selected. In practice that is
 * an improvement: one set of arguments at a time, at a readable size, rather
 * than every step's controls competing at once.
 */

function Endpoint({ label, bytes }: { label: string; bytes?: number }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--text-faint)]" />
      <span className="font-mono text-micro uppercase tracking-wider text-faint">{label}</span>
      {bytes !== undefined && <span className="font-mono text-[10px] text-faint">{bytes}B</span>}
    </span>
  );
}

function Connector() {
  return <span aria-hidden="true" className="h-px w-4 shrink-0 bg-line" />;
}

const OP_MIME = 'application/x-decodebox-op';

/** Whether a drag is carrying an operation, readable during dragover. */
function carriesOperation(event: React.DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes(OP_MIME);
}

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
    // The bar stays 4px because that is what reads as a seam between two nodes.
    // The thing that catches the pointer is three times wider, which costs
    // nothing visually and is the difference between landing it and not.
    <span
      onDragOver={(event) => {
        event.preventDefault();
        onEnter(index);
      }}
      onDrop={(event) => onDrop(event, index)}
      className="grid h-6 w-3 shrink-0 cursor-copy place-items-center"
    >
      <span
        aria-hidden="true"
        className={cx(
          'h-6 w-1 rounded-full transition-colors duration-100',
          active ? 'bg-purple' : 'bg-transparent',
        )}
      />
    </span>
  );
}

function Node({ index }: { index: number }) {
  const step = useStore((s) => s.steps[index]);
  const operations = useStore((s) => s.operations);
  const selected = useStore((s) => s.selectedStepUid);
  const breakpoints = useStore((s) => s.breakpoints);
  const pausedAt = useStore((s) => s.pausedAt);
  const error = useStore((s) => s.bakeResult?.error);
  const selectStep = useStore((s) => s.selectStep);
  const removeStep = useStore((s) => s.removeStep);
  const toggleBreakpoint = useStore((s) => s.toggleBreakpoint);

  if (!step) return null;
  const op = operations.find((o) => o.id === step.opId);
  const isFlow = op?.isFlowControl === true;
  const isSelected = selected === step.uid;
  const hasBreak = breakpoints.includes(step.uid);
  const failed = error?.stepIndex === index;
  const paused = pausedAt === index;

  return (
    <span
      className={cx(
        'group flex shrink-0 items-center gap-1 rounded-full border ps-1 pe-1 py-1',
        'transition-colors duration-150 ease-smooth',
        step.disabled && 'opacity-40',
        failed
          ? 'border-[var(--red)] bg-surface'
          : isSelected
            ? 'border-purple-line bg-purple-soft'
            : isFlow
              ? 'border-dashed border-line-strong bg-surface-2 hover:border-purple-line'
              : 'border-line bg-surface hover:border-line-strong',
      )}
    >
      {/*
        Somewhere to actually grab.

        The chip was `draggable` and every pixel of it was a <button>, and a
        button swallows drag initiation — the gesture never starts, so dragging
        a step out did nothing while clicking the cross worked fine. This is a
        plain span, which drags, and it says so with a cursor and a grip.
      */}
      {/*
        The grip is always visible, not on hover.

        Fading it in on hover meant you had to know it was there to look for
        it, and it is the thing that says this chip can be moved at all. It is
        quiet rather than hidden, and it is wide enough to hit: 11px of icon in
        a 16px target, which is the difference between picking a step up and
        chasing it.
      */}
      <span
        aria-hidden="true"
        className="flex w-4 shrink-0 cursor-grab items-center justify-center text-faint transition-colors hover:text-muted active:cursor-grabbing"
        title={t.recipe.drag}
      >
        <GripVertical size={12} />
      </span>

      <button
        type="button"
        onClick={() => toggleBreakpoint(step.uid)}
        aria-label={hasBreak ? t.recipe.clearBreakpoint : t.recipe.setBreakpoint}
        aria-pressed={hasBreak}
        title={hasBreak ? t.recipe.clearBreakpoint : t.recipe.setBreakpoint}
        className="shrink-0 rounded-full p-0.5"
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

      <button
        type="button"
        draggable
        onClick={() => selectStep(step.uid)}
        aria-pressed={isSelected}
        className="flex cursor-grab items-center gap-1.5 active:cursor-grabbing"
      >
        <span className="font-mono text-[10px] text-faint">{index + 1}</span>
        <span className="whitespace-nowrap font-mono text-xs2">{op?.name ?? step.opId}</span>
      </button>

      <button
        type="button"
        onClick={() => removeStep(step.uid)}
        aria-label={t.recipe.remove}
        title={t.recipe.remove}
        className="shrink-0 rounded-full p-0.5 text-faint opacity-0 transition-opacity hover:text-text group-hover:opacity-100 focus-visible:opacity-100"
      >
        <X size={11} aria-hidden="true" />
      </button>
    </span>
  );
}

function Inspector() {
  const selected = useStore((s) => s.selectedStepUid);
  const step = useStore((s) => s.steps.find((x) => x.uid === selected));
  const operations = useStore((s) => s.operations);
  const updateArg = useStore((s) => s.updateArg);
  const toggleStep = useStore((s) => s.toggleStep);
  const moveStep = useStore((s) => s.moveStep);
  const steps = useStore((s) => s.steps);

  if (!step) return null;
  const op = operations.find((o) => o.id === step.opId);
  const index = steps.findIndex((s) => s.uid === step.uid);

  return (
    <div className="mt-2 rounded-control border border-line bg-surface-2 p-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xs2 font-medium">{op?.name ?? step.opId}</h3>
          {op && <p className="mt-0.5 text-micro text-faint">{op.description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => moveStep(step.uid, -1)}
            disabled={index === 0}
            aria-label={t.recipe.moveUp}
            className="rounded p-1 text-faint transition-colors hover:bg-surface-3 hover:text-text disabled:opacity-30"
          >
            <span aria-hidden="true" className="text-[11px] leading-none">
              ←
            </span>
          </button>
          <button
            type="button"
            onClick={() => moveStep(step.uid, 1)}
            disabled={index === steps.length - 1}
            aria-label={t.recipe.moveDown}
            className="rounded p-1 text-faint transition-colors hover:bg-surface-3 hover:text-text disabled:opacity-30"
          >
            <span aria-hidden="true" className="text-[11px] leading-none">
              →
            </span>
          </button>
          <button
            type="button"
            onClick={() => toggleStep(step.uid)}
            aria-label={step.disabled ? t.recipe.enable : t.recipe.disable}
            className="rounded p-1 text-faint transition-colors hover:bg-surface-3 hover:text-text"
          >
            {step.disabled ? (
              <EyeOff size={12} aria-hidden="true" />
            ) : (
              <Eye size={12} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {step.args.length > 0 ? (
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {step.args.map((arg) => (
            <ArgControl
              key={arg.name}
              stepUid={step.uid}
              arg={arg}
              onChange={(patch) => updateArg(step.uid, arg.name, patch)}
            />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-micro text-faint">{t.recipe.noArguments}</p>
      )}
    </div>
  );
}

export function Pipeline() {
  const steps = useStore((s) => s.steps);
  const removeStepFromRecipe = useStore((s) => s.removeStep);
  const input = useStore((s) => s.input);
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

  // Dragging a step, currently outside the pane: releasing here removes it.
  const removing = draggingUid !== null && !dropping;

  const paused = pausedAt !== null;
  // One name for the one condition. Keying `disabled` and the styling off
  // separate copies of the same expression is how they drift apart.
  const empty = steps.length === 0;

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
    // Released outside every drop target in the pane: that is the gesture for
    // taking a step out. Putting one in has always been a drag; taking one out
    // required finding a 20px cross, which is the harder half of the same job.
    if (draggingUid && dropEffect === 'none' && !cancelled.current) {
      removeStepFromRecipe(draggingUid);
    }
    setDraggingUid(null);
    setSlot(null);
    setDropping(false);
  };

  const onDrop = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    // A slot that handled the drop must not let the pane handle it again at a
    // different index.
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
      /*
       * The whole pane takes a drop, and anything that lands between the slots
       * goes on the end.
       *
       * Placement is the rare intent. Almost always the answer to "where in the
       * recipe?" is "after the last step", and making that require a hit on a
       * 4px seam turns the common case into the fiddly one. The seams still
       * work, and still say where they will insert; missing one is no longer a
       * failure.
       */
      onDragOver={(event) => {
        if (!carriesOperation(event) && draggingUid === null) return;
        event.preventDefault();
        setDropping(true);
      }}
      onDragLeave={(event) => {
        // Moving onto a child fires dragleave on the parent too. Only an exit
        // from the pane itself counts.
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setDropping(false);
        setSlot(null);
      }}
      onDrop={(event) => onDrop(event, steps.length)}
      className={cx(
        'shrink-0 border-y bg-bg px-3 py-2 transition-colors duration-150 ease-smooth',
        dropping ? 'border-purple-line bg-purple-wash' : 'border-line',
      )}
    >
      {removing && (
        <p
          role="status"
          className="mb-1.5 flex items-center gap-1.5 text-micro font-medium"
          style={{ color: 'var(--red)' }}
        >
          <Trash2 size={12} aria-hidden="true" />
          {t.recipe.dropToRemove}
        </p>
      )}

      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StepBadge step={2} />
          <h2
            className="font-mono text-xs2 font-semibold uppercase tracking-[0.08em]"
            style={{ color: 'var(--purple-text)' }}
          >
            {t.recipe.title}
          </h2>
          {steps.length > 0 && (
            <>
              <span className="font-mono text-micro text-faint">{steps.length}</span>
              {paused && (
                <span className="font-mono text-micro" style={{ color: 'var(--amber)' }}>
                  {t.recipe.pausedAt(pausedAt + 1)}
                </span>
              )}
              <button
                type="button"
                onClick={clearRecipe}
                className="text-micro text-faint transition-colors hover:text-text"
              >
                {t.recipe.clearShort}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/*
            A checkbox and a primary button that do the same thing.

            With "run automatically" ticked, the recipe has already run by the
            time the button is drawn, so pressing it re-runs a result that is
            already on screen — an action whose only honest label is "again".
            The button therefore stops being primary while the checkbox is on
            and says what it is for, and the checkbox says what it is doing
            rather than naming a setting.
          */}
          {/*
            The checkbox itself is 12px. The label is the target, and at 16px
            high it was still under the 24px WCAG 2.5.8 asks for, so it gets the
            padding to clear it. Nothing moves visually; the hit area grows.
          */}
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

          <button
            type="button"
            onClick={() => void stepOnce()}
            disabled={!paused}
            aria-label={t.recipe.step}
            title={t.recipe.step}
            className="rounded-control border border-line p-1.5 text-muted transition-colors duration-150 hover:border-line-strong hover:text-text disabled:opacity-30"
          >
            <SkipForward size={12} aria-hidden="true" />
          </button>

          {/*
            The primary action, and it looks like one.

            It used to be a small outlined button that was *disabled whenever
            auto-bake was on* — which is the default — so the most important
            control in the workspace was permanently greyed out. Wanting to
            re-run on purpose is a normal thing to want, whether or not it also
            happens by itself, so the only reason to disable it is an empty
            recipe.
          */}
          <button
            type="button"
            onClick={() => void runRecipe()}
            disabled={empty}
            className={cx(
              'flex items-center gap-2 rounded-control px-4 py-2 text-xs2 font-semibold',
              'transition-colors duration-150 ease-smooth',
              // Solid, not an outline: white on this purple measures 4.60:1,
              // where the background tokens land at 4.33 and 4.48 — both just
              // under AA for text this size.
              empty || autoBake
                ? 'border border-line text-muted hover:border-line-strong hover:bg-surface-3'
                : 'bg-purple text-white hover:brightness-110',
            )}
          >
            <Play size={13} aria-hidden="true" />
            {/* "Run again" is a lie before anything has run once. */}
            {baking ? t.recipe.baking : autoBake && !empty ? t.recipe.rerun : t.recipe.bake}
          </button>
        </div>
      </div>

      <div
        onDragLeave={() => setSlot(null)}
        className="flex items-center gap-1 overflow-x-auto pb-1"
      >
        <Endpoint label={t.input.title} bytes={new TextEncoder().encode(input).length} />
        <Connector />
        <DropSlot index={0} active={slot === 0} onEnter={setSlot} onDrop={onDrop} />

        {steps.map((step, index) => (
          <span key={step.uid} className="flex items-center gap-1">
            <span
              draggable
              onDragStart={(event) => {
                startStepDrag(step.uid);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', step.uid);
              }}
              onDragEnd={(event) => endStepDrag(event.dataTransfer.dropEffect)}
              className={cx(
                'cursor-grab transition-opacity active:cursor-grabbing',
                draggingUid === step.uid && (removing ? 'opacity-20' : 'opacity-30'),
              )}
            >
              <Node index={index} />
            </span>
            <DropSlot
              index={index + 1}
              active={slot === index + 1}
              onEnter={setSlot}
              onDrop={onDrop}
            />
          </span>
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
            'flex shrink-0 items-center gap-1.5 rounded-full border border-dashed px-2.5 py-1',
            'text-micro transition-colors duration-150 ease-smooth',
            slot === steps.length
              ? 'border-purple bg-purple-soft text-text'
              : 'border-line text-faint hover:border-purple-line hover:text-text',
          )}
        >
          <Plus size={11} aria-hidden="true" />
          {steps.length === 0 ? t.recipe.addFirst : t.recipe.add}
        </button>

        <Connector />
        <Endpoint label={t.output.title} bytes={result?.byteLength} />
      </div>

      <Inspector />
    </section>
  );
}
