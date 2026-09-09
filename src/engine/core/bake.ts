import type { BakeResult, OperationArg, OutputType, Recipe, RecipeStep } from '../types';
import { OperationError } from '../types';
import { getOperation } from '../operations';
import { asBytes, byteLength, printableRatio } from './bytes';
import { imageMime } from './image';

/**
 * The recipe executor.
 *
 * This began as a fold over a list of steps, which is all a linear chain needs.
 * Flow control turned it into a small interpreter: a program counter, a
 * register file, and structured blocks that run a sub-recipe over many pieces
 * of the data at once.
 *
 * Every loop here is bounded. A recipe is user input like any other, and one
 * that jumps to a label above itself would otherwise run until the tab dies.
 */

/**
 * Thrown by Return to unwind out of however many Forks it sits inside.
 *
 * Not an Error: every catch in this file that swallows failures checks for it
 * first, and making the difference a type rather than a message means a Return
 * can never be mistaken for a step that went wrong.
 */
class ReturnSignal {
  constructor(readonly value: string) {}
}

/** Guards against an operation that loops on adversarial input. */
const STEP_TIMEOUT_MS = 5000;
/** Whole-recipe ceiling, so a bounded loop of slow steps still terminates. */
const RECIPE_TIMEOUT_MS = 15000;
/** Fork branches beyond this are dropped; a report nobody can read helps nobody. */
const MAX_BRANCHES = 2000;

function classify(output: string): OutputType {
  const trimmed = output.trim();
  // A data: URI naming an image is rendered by the output pane rather than
  // printed as several thousand characters of Base64 — and so are raw image
  // bytes, so an image operation's output is visible without a final step to
  // turn it into a URI.
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(trimmed)) return 'image';
  if (output.length > 0 && imageMime(asBytes(output)) !== null) return 'image';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      /* shaped like JSON but is not; fall through */
    }
  }
  if (output.length > 0 && printableRatio(asBytes(output)) < 0.85) return 'bytes';
  return 'text';
}

async function withTimeout(work: Promise<string>, opName: string, budget: number): Promise<string> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new OperationError(`${opName} took longer than ${budget}ms.`)),
      budget,
    );
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/** Turns the escape sequences a person types in an argument into real characters. */
function unescape(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\0/g, '\0')
    .replace(/\\\\/g, '\\');
}

function argValue(step: RecipeStep, name: string, fallback: string | number | boolean) {
  return step.args.find((a) => a.name === name)?.value ?? fallback;
}

function buildRegex(pattern: string, flags: string): RegExp {
  try {
    return new RegExp(pattern, flags);
  } catch (error) {
    throw new OperationError(
      `Not a valid regular expression: ${error instanceof Error ? error.message : 'parse failed'}`,
    );
  }
}

/**
 * Substitutes $R0, $R1… into string arguments before a step runs.
 *
 * Done on a copy: writing into the step would make the recipe change shape as
 * it executed, and the same recipe would then behave differently the second
 * time it was baked.
 */
function applyRegisters(step: RecipeStep, registers: string[]): RecipeStep {
  if (registers.length === 0) return step;

  const substitute = (value: OperationArg['value']): OperationArg['value'] => {
    if (typeof value !== 'string' || !value.includes('$R')) return value;
    return value.replace(/\$R(\d+)/g, (whole, index: string) => registers[Number(index)] ?? whole);
  };

  return { ...step, args: step.args.map((a) => ({ ...a, value: substitute(a.value) })) };
}

/** Finds the Merge that closes the block opened at `from`, honouring nesting. */
function findMerge(steps: RecipeStep[], from: number): number {
  let depth = 0;
  for (let i = from + 1; i < steps.length; i++) {
    const step = steps[i];
    if (!step || step.disabled) continue;
    if (step.opId === 'fork' || step.opId === 'subsection') depth++;
    else if (step.opId === 'merge') {
      if (depth === 0) return i;
      depth--;
    }
  }
  // An unclosed block runs to the end of the recipe, which is what someone
  // building one incrementally expects.
  return steps.length;
}

interface Machine {
  registers: string[];
  jumps: Map<string, number>;
  deadline: number;
  /** Index of the step that failed, so the interface can point at it. */
  failedAt: number | null;
  failure: string | null;
}

async function runStep(
  step: RecipeStep,
  index: number,
  value: string,
  machine: Machine,
): Promise<string> {
  const operation = getOperation(step.opId);
  if (!operation) throw new OperationError(`Unknown operation '${step.opId}'.`);

  const prepared = applyRegisters(step, machine.registers);
  void index;

  // An operation that declares a longer budget also pushes the whole recipe's
  // deadline out, or the ceiling meant to stop runaway input would stop it too.
  const budget = operation.budgetMs ?? STEP_TIMEOUT_MS;
  if (budget > STEP_TIMEOUT_MS) {
    machine.deadline = Math.max(machine.deadline, performance.now() + budget + 1000);
  }

  return withTimeout(Promise.resolve(operation.run(value, prepared.args)), operation.name, budget);
}

/**
 * Runs a slice of a recipe. Called once for the whole thing, and again for each
 * branch of a Fork or each match of a Subsection.
 */
async function execute(
  steps: RecipeStep[],
  input: string,
  machine: Machine,
  offset: number,
): Promise<string> {
  let value = input;
  let pc = 0;

  while (pc < steps.length) {
    if (performance.now() > machine.deadline) {
      throw new OperationError(`The recipe ran for longer than ${RECIPE_TIMEOUT_MS}ms.`);
    }

    const step = steps[pc];
    if (!step || step.disabled) {
      pc++;
      continue;
    }

    const absolute = offset + pc;

    try {
      switch (step.opId) {
        case 'comment':
        case 'label':
        case 'merge': {
          pc++;
          continue;
        }

        case 'return':
          throw new ReturnSignal(value);

        case 'register': {
          const pattern = String(argValue(step, 'Pattern', ''));
          if (pattern.length === 0) {
            throw new OperationError('Register needs a pattern with capture groups.');
          }
          const found = buildRegex(pattern, argValue(step, 'Case insensitive', false) ? 'i' : '').exec(
            value,
          );
          if (found) machine.registers = found.slice(1).map((group) => group ?? '');
          pc++;
          continue;
        }

        case 'jump':
        case 'conditional-jump': {
          const name = String(argValue(step, 'Label', ''));
          const limit = Number(argValue(step, 'Maximum jumps', 10));

          if (step.opId === 'conditional-jump') {
            const pattern = String(argValue(step, 'Pattern', ''));
            const matched =
              pattern.length > 0 && buildRegex(pattern, '').test(value);
            if (matched === Boolean(argValue(step, 'Invert', false))) {
              pc++;
              continue;
            }
          }

          const key = `${absolute}:${name}`;
          const taken = machine.jumps.get(key) ?? 0;
          if (taken >= limit) {
            // Reaching the cap is normal for a loop that has finished, not an
            // error: fall through to the next step.
            pc++;
            continue;
          }
          machine.jumps.set(key, taken + 1);

          const target = steps.findIndex(
            (s) => s.opId === 'label' && String(argValue(s, 'Name', '')) === name,
          );
          if (target === -1) throw new OperationError(`No label called '${name}' in this recipe.`);
          pc = target + 1;
          continue;
        }

        case 'fork': {
          const end = findMerge(steps, pc);
          const body = steps.slice(pc + 1, end);
          const splitOn = unescape(String(argValue(step, 'Split on', '\\n')));
          const joinWith = unescape(String(argValue(step, 'Join with', '\\n')));
          const forgiving = Boolean(argValue(step, 'Ignore errors', true));

          const branches = (splitOn.length === 0 ? [value] : value.split(splitOn)).slice(
            0,
            MAX_BRANCHES,
          );

          const results: string[] = [];
          for (const branch of branches) {
            try {
              results.push(await execute(body, branch, machine, offset + pc + 1));
            } catch (error) {
              // One malformed line out of ten thousand should not lose the
              // other nine thousand nine hundred and ninety-nine.
              if (error instanceof ReturnSignal || !forgiving) throw error;
              results.push(branch);
            }
          }

          value = results.join(joinWith);
          pc = end + 1;
          continue;
        }

        case 'subsection': {
          const end = findMerge(steps, pc);
          const body = steps.slice(pc + 1, end);
          const pattern = String(argValue(step, 'Pattern', ''));
          if (pattern.length === 0) throw new OperationError('Subsection needs a pattern.');

          const regex = buildRegex(
            pattern,
            argValue(step, 'Case insensitive', false) ? 'gi' : 'g',
          );
          const forgiving = Boolean(argValue(step, 'Ignore errors', true));

          let out = '';
          let cursor = 0;
          let count = 0;

          for (const found of value.matchAll(regex)) {
            const at = found.index ?? 0;
            if (found[0].length === 0) continue;
            if (++count > MAX_BRANCHES) break;

            out += value.slice(cursor, at);
            try {
              out += await execute(body, found[0], machine, offset + pc + 1);
            } catch (error) {
              if (error instanceof ReturnSignal || !forgiving) throw error;
              out += found[0];
            }
            cursor = at + found[0].length;
          }

          value = out + value.slice(cursor);
          pc = end + 1;
          continue;
        }

        default: {
          value = await runStep(step, absolute, value, machine);
          pc++;
        }
      }
    } catch (error) {
      if (error instanceof ReturnSignal) throw error;
      machine.failedAt ??= absolute;
      machine.failure ??= error instanceof Error ? error.message : 'Operation failed.';
      throw error;
    }
  }

  return value;
}

export async function bake(input: string, recipe: Recipe): Promise<BakeResult> {
  const started = performance.now();
  const machine: Machine = {
    registers: [],
    jumps: new Map(),
    deadline: started + RECIPE_TIMEOUT_MS,
    failedAt: null,
    failure: null,
  };

  try {
    const output = await execute(recipe.steps, input, machine, 0);
    return {
      output,
      outputType: classify(output),
      byteLength: byteLength(output),
      durationMs: performance.now() - started,
    };
  } catch (error) {
    // Return is not a failure: it is the recipe saying it is finished early,
    // and the value it stopped at is the answer.
    if (error instanceof ReturnSignal) {
      return {
        output: error.value,
        outputType: classify(error.value),
        byteLength: byteLength(error.value),
        durationMs: performance.now() - started,
      };
    }

    // The last value is lost when a step throws mid-chain, so the error carries
    // the position instead. Returning something is the contract: bake never
    // rejects, because the interface has to render *something*.
    return {
      output: '',
      outputType: 'text',
      byteLength: 0,
      durationMs: performance.now() - started,
      error: {
        stepIndex: machine.failedAt ?? 0,
        message:
          machine.failure ?? (error instanceof Error ? error.message : 'The recipe failed.'),
      },
    };
  }
}
