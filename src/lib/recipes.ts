import type { OperationArg, RecipeStep } from '../engine';
import { safeArgValue } from './share';

/** A recipe the user chose to keep, stored only in their own browser. */
export interface SavedRecipe {
  id: string;
  name: string;
  steps: RecipeStep[];
  savedAt: number;
}

const KEY = 'decodebox-recipes';
const MAX = 100;

function readArg(value: unknown): OperationArg | null {
  if (typeof value !== 'object' || value === null) return null;
  const arg = value as Partial<OperationArg>;
  if (typeof arg.name !== 'string' || typeof arg.type !== 'string') return null;
  // The declared type says primitive; storage is under no obligation to agree,
  // and the value travels from here into an operation's arguments.
  return { ...(arg as OperationArg), value: safeArgValue(arg.value, '') };
}

function readStep(value: unknown): RecipeStep | null {
  if (typeof value !== 'object' || value === null) return null;
  const step = value as Partial<RecipeStep>;
  if (typeof step.opId !== 'string' || !Array.isArray(step.args)) return null;

  const args: OperationArg[] = [];
  for (const raw of step.args) {
    const arg = readArg(raw);
    // One unreadable argument makes the whole step a different step, so the
    // step goes rather than quietly losing a setting.
    if (!arg) return null;
    args.push(arg);
  }

  return {
    uid: typeof step.uid === 'string' ? step.uid : `${step.opId}-restored`,
    opId: step.opId,
    args,
    disabled: step.disabled === true,
  };
}

/**
 * Reads what is in storage, treating all of it as untrusted.
 *
 * localStorage is writable by anything running on this origin and by the person
 * with devtools open, so what comes back is input like any other. The old
 * version checked that `steps` was an array and stopped there, which let
 * `{"args": {"not": "an array"}}` through to `instantiate` and produced an
 * uncaught `step.args.map is not a function` on the click that loaded it.
 *
 * A recipe with an unreadable step is dropped whole rather than repaired.
 * Loading four steps of a five-step recipe under its original name is a worse
 * answer than not offering it.
 */
export function loadRecipes(): SavedRecipe[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const recipes: SavedRecipe[] = [];
    for (const entry of parsed) {
      if (typeof entry !== 'object' || entry === null) continue;
      const candidate = entry as Partial<SavedRecipe>;
      if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') continue;
      if (!Array.isArray(candidate.steps)) continue;

      const steps: RecipeStep[] = [];
      let intact = true;
      for (const rawStep of candidate.steps) {
        const step = readStep(rawStep);
        if (!step) {
          intact = false;
          break;
        }
        steps.push(step);
      }
      if (!intact) continue;

      recipes.push({
        id: candidate.id,
        name: candidate.name,
        steps,
        savedAt: typeof candidate.savedAt === 'number' ? candidate.savedAt : 0,
      });
    }
    return recipes;
  } catch {
    return [];
  }
}

function persist(recipes: SavedRecipe[]): SavedRecipe[] {
  const trimmed = recipes.slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* quota or private mode; the list stays in memory for this session */
  }
  return trimmed;
}

export function saveRecipe(name: string, steps: RecipeStep[]): SavedRecipe[] {
  const recipe: SavedRecipe = {
    id: `r-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || 'Untitled recipe',
    steps: steps.map((s) => ({ ...s, args: s.args.map((a) => ({ ...a })) })),
    savedAt: Date.now(),
  };
  return persist([recipe, ...loadRecipes()]);
}

export function deleteRecipe(id: string): SavedRecipe[] {
  return persist(loadRecipes().filter((r) => r.id !== id));
}

/** Fresh uids, so loading the same recipe twice does not collide. */
export function instantiate(recipe: SavedRecipe): RecipeStep[] {
  return recipe.steps.map((step) => ({
    ...step,
    uid: `${step.opId}-${Math.random().toString(36).slice(2, 9)}`,
    args: step.args.map((a) => ({ ...a })),
  }));
}
