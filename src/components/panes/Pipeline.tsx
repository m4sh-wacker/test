import { useState } from 'react';
import { Circle, Eye, EyeOff, Play, Plus, SkipForward, X } from 'lucide-react';
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
    <span
      onDragOver={(event) => {
        event.preventDefault();
        onEnter(index);
      }}
      onDrop={(event) => onDrop(event, index)}
      className={cx(
        'h-6 w-1 shrink-0 rounded-full transition-colors duration-100',
        active ? 'bg-purple' : 'bg-transparent',
      )}
    />
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
        'group flex shrink-0 items-center gap-1.5 rounded-full border ps-1.5 pe-1 py-1',
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
        onClick={() => selectStep(step.uid)}
        aria-pressed={isSelected}
        className="flex items-center gap-1.5"
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

  const paused = pausedAt !== null;
  // One name for the one condition. Keying `disabled` and the styling off
  // separate copies of the same expression is how they drift apart.
  const empty = steps.length === 0;

  const onDrop = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    const opId = event.dataTransfer.getData('application/x-decodebox-op');
    if (opId) addStep(opId, index);
    else if (draggingUid) reorderStep(draggingUid, index);
    setDraggingUid(null);
    setSlot(null);
  };

  return (
    <section aria-label={t.recipe.title} className="shrink-0 border-y border-line bg-bg px-3 py-2">
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
          <label className="flex cursor-pointer items-center gap-1.5 text-micro text-faint">
            <input
              type="checkbox"
              checked={autoBake}
              onChange={(e) => setAutoBake(e.target.checked)}
              className="h-3 w-3 accent-[var(--purple)]"
            />
            {t.recipe.autoBake}
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
              empty ? 'border border-line text-faint' : 'bg-purple text-white hover:brightness-110',
            )}
          >
            <Play size={13} aria-hidden="true" />
            {baking ? t.recipe.baking : t.recipe.bake}
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
                setDraggingUid(step.uid);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', step.uid);
              }}
              onDragEnd={() => {
                setDraggingUid(null);
                setSlot(null);
              }}
              className={cx('cursor-grab active:cursor-grabbing', draggingUid === step.uid && 'opacity-30')}
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
