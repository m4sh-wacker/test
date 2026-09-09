import type { RecipeStep } from '../engine';

/** A recipe the user chose to keep, stored only in their own browser. */
export interface SavedRecipe {
  id: string;
  name: string;
  steps: RecipeStep[];
  savedAt: number;
}

const KEY = 'decodebox-recipes';
const MAX = 100;

export function loadRecipes(): SavedRecipe[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Stored data is still untrusted: another tab, an older build, or a person
    // editing localStorage by hand could all have written it.
    return parsed.filter(
      (entry): entry is SavedRecipe =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as SavedRecipe).id === 'string' &&
        typeof (entry as SavedRecipe).name === 'string' &&
        Array.isArray((entry as SavedRecipe).steps),
    );
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
