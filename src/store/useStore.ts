import { create } from 'zustand';
import {
  analyse,
  autoDecode,
  bake,
  detect,
  encodeInput,
  hints,
  identify,
  INPUT_ENCODINGS,
  listOperations,
  toChain,
  type BakeResult,
  type Candidate,
  type Analysis,
  type CtfReport,
  type HashIdentification,
  type Hint,
  type Layer,
  type OperationArg,
  type OperationDef,
  type RecipeStep,
} from '../engine';
import { decodeShare } from '../lib/share';
import {
  deleteRecipe,
  instantiate,
  loadRecipes,
  saveRecipe,
  type SavedRecipe,
} from '../lib/recipes';

type Theme = 'light' | 'dark' | 'system';
export type MobilePane = 'operations' | 'recipe' | 'input' | 'output';
export type View = 'workspace' | 'report' | 'ctf';
export type Dialog = 'help' | 'share' | 'library' | null;

interface State {
  input: string;
  /**
   * How typed input is read as bytes.
   *
   * Everything downstream of this pane is a byte string, so the reading has to
   * be decided once, here. A loaded file switches this to 'Raw bytes', because
   * a file already is bytes and encoding it again would corrupt it.
   */
  inputEncoding: string;
  steps: RecipeStep[];
  operations: OperationDef[];
  favourites: string[];
  savedRecipes: SavedRecipe[];

  /** Step uids paused on. Kept out of the engine contract: baking a prefix
   *  expresses the same thing without the engine needing to know. */
  /** The step whose arguments the inspector is showing. */
  selectedStepUid: string | null;
  breakpoints: string[];
  /** Index of the next step to run while stepping, or null when not paused. */
  pausedAt: number | null;

  bakeResult: BakeResult | null;
  autoBake: boolean;
  baking: boolean;

  analysing: boolean;
  root: Layer | null;
  chain: Layer[];
  activeLayerId: string | null;
  candidates: Candidate[];
  identification: HashIdentification | null;
  /** The full report, computed alongside detection. */
  analysis: Analysis | null;
  whyOpen: boolean;
  suggestionDismissed: boolean;

  /**
   * CTF mode is computed on demand rather than with every other analysis.
   *
   * It recovers cipher keys by search over the whole decode chain, which is far
   * too much to spend on a keystroke that nobody is watching the result of. It
   * runs when the view is open, and not otherwise.
   */
  ctf: CtfReport | null;
  ctfFormat: string;
  ctfRunning: boolean;

  paneWidths: { operations: number; recipe: number };
  mobilePane: MobilePane;
  outputMaximised: boolean;
  view: View;
  railOpen: boolean;
  recipeView: 'visual' | 'text';
  theme: Theme;
  dialog: Dialog;

  setInput: (value: string, encoding?: string) => void;
  setInputEncoding: (encoding: string) => void;
  clearInput: () => void;

  loadOperations: () => Promise<void>;
  restoreFromUrl: () => Promise<void>;

  addStep: (opId: string, atIndex?: number) => void;
  removeStep: (uid: string) => void;
  moveStep: (uid: string, direction: -1 | 1) => void;
  reorderStep: (uid: string, toIndex: number) => void;
  toggleStep: (uid: string) => void;
  toggleBreakpoint: (uid: string) => void;
  selectStep: (uid: string | null) => void;
  focusSearch: () => void;
  updateArg: (uid: string, argName: string, patch: Partial<OperationArg>) => void;
  setSteps: (steps: RecipeStep[]) => void;
  clearRecipe: () => void;
  toggleFavourite: (opId: string) => void;

  runRecipe: () => Promise<void>;
  stepOnce: () => Promise<void>;
  setAutoBake: (on: boolean) => void;

  analyse: () => Promise<void>;
  applySuggestion: () => void;
  dismissSuggestion: () => void;
  setActiveLayer: (id: string) => void;
  toggleWhy: () => void;

  runCtf: () => Promise<void>;
  setCtfFormat: (format: string) => void;
  applyHint: (hint: Hint) => void;

  saveCurrentRecipe: (name: string) => void;
  loadSavedRecipe: (id: string) => void;
  removeSavedRecipe: (id: string) => void;

  setPaneWidth: (pane: 'operations' | 'recipe', width: number) => void;
  setMobilePane: (pane: MobilePane) => void;
  setOutputMaximised: (maximised: boolean) => void;
  setView: (view: View) => void;
  setRailOpen: (open: boolean) => void;
  setRecipeView: (view: 'visual' | 'text') => void;
  setTheme: (theme: Theme) => void;
  setDialog: (dialog: Dialog) => void;
}

const THEME_KEY = 'decodebox-theme';
const PANES_KEY = 'decodebox-panes';
const FAVOURITES_KEY = 'decodebox-favourites';
const ENCODING_KEY = 'decodebox-input-encoding';
const CTF_FORMAT_KEY = 'decodebox-ctf-format';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* the preference simply will not persist */
  }
}

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* fall through to system */
  }
  return 'system';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    if (theme === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* not persisted */
  }
}

function newStep(op: OperationDef): RecipeStep {
  return {
    uid: `${op.id}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    opId: op.id,
    args: op.args.map((a) => ({ ...a })),
    disabled: false,
  };
}

// Rising counters so a slow run can never overwrite the result of a newer one.
let bakeToken = 0;
let analysisToken = 0;
let ctfToken = 0;

export const useStore = create<State>((set, get) => ({
  input: '',
  inputEncoding: read(ENCODING_KEY, 'UTF-8'),
  steps: [],
  operations: [],
  favourites: read<string[]>(FAVOURITES_KEY, []),
  savedRecipes: loadRecipes(),

  selectedStepUid: null,
  breakpoints: [],
  pausedAt: null,

  bakeResult: null,
  autoBake: true,
  baking: false,

  analysing: false,
  root: null,
  chain: [],
  activeLayerId: null,
  candidates: [],
  identification: null,
  analysis: null,
  whyOpen: false,
  suggestionDismissed: false,

  ctf: null,
  ctfFormat: read(CTF_FORMAT_KEY, ''),
  ctfRunning: false,

  paneWidths: read(PANES_KEY, { operations: 264, recipe: 380 }),
  mobilePane: 'input',
  outputMaximised: false,
  view: 'workspace',
  railOpen: read('decodebox-rail', true),
  recipeView: 'visual',
  theme: readTheme(),
  dialog: null,

  setInput: (value, encoding) => {
    if (encoding !== undefined && encoding !== get().inputEncoding) {
      set({ inputEncoding: encoding });
      write(ENCODING_KEY, encoding);
    }
    set({ input: value, suggestionDismissed: false });
    if (value.trim().length === 0) {
      set({
        root: null,
        chain: [],
        activeLayerId: null,
        candidates: [],
        identification: null,
        analysis: null,
        ctf: null,
        bakeResult: null,
      });
    }
  },

  setInputEncoding: (encoding) => {
    if (!INPUT_ENCODINGS.includes(encoding)) return;
    set({ inputEncoding: encoding });
    write(ENCODING_KEY, encoding);
    void get().analyse();
    if (get().autoBake) void get().runRecipe();
  },

  clearInput: () =>
    set({
      input: '',
      root: null,
      chain: [],
      activeLayerId: null,
      candidates: [],
      identification: null,
      analysis: null,
      ctf: null,
      bakeResult: null,
      whyOpen: false,
      suggestionDismissed: false,
    }),

  loadOperations: async () => {
    if (get().operations.length > 0) return;
    set({ operations: await listOperations() });
  },

  restoreFromUrl: async () => {
    const hash = location.hash;
    if (!hash.startsWith('#s=')) return;

    await get().loadOperations();
    const shared = await decodeShare(hash, get().operations);
    if (!shared) return;

    set({ steps: shared.steps });
    if (shared.input !== undefined) set({ input: shared.input });
    void get().runRecipe();
  },

  addStep: (opId, atIndex) => {
    const op = get().operations.find((o) => o.id === opId);
    if (!op) return;
    const steps = [...get().steps];
    const added = newStep(op);
    steps.splice(atIndex ?? steps.length, 0, added);
    set({ steps, pausedAt: null, selectedStepUid: added.uid });
    if (get().autoBake) void get().runRecipe();
  },

  removeStep: (uid) => {
    set((s) => ({
      steps: s.steps.filter((step) => step.uid !== uid),
      breakpoints: s.breakpoints.filter((id) => id !== uid),
      selectedStepUid: s.selectedStepUid === uid ? null : s.selectedStepUid,
      pausedAt: null,
    }));
    if (get().autoBake) void get().runRecipe();
  },

  moveStep: (uid, direction) => {
    const index = get().steps.findIndex((s) => s.uid === uid);
    if (index === -1) return;
    get().reorderStep(uid, index + direction);
  },

  reorderStep: (uid, toIndex) => {
    const steps = [...get().steps];
    const from = steps.findIndex((s) => s.uid === uid);
    if (from === -1) return;

    const target = Math.max(0, Math.min(steps.length - 1, toIndex));
    if (target === from) return;

    const [moved] = steps.splice(from, 1);
    steps.splice(target, 0, moved!);
    set({ steps, pausedAt: null });
    if (get().autoBake) void get().runRecipe();
  },

  toggleStep: (uid) => {
    set((s) => ({
      steps: s.steps.map((step) =>
        step.uid === uid ? { ...step, disabled: !step.disabled } : step,
      ),
      pausedAt: null,
    }));
    if (get().autoBake) void get().runRecipe();
  },

  toggleBreakpoint: (uid) => {
    set((s) => ({
      breakpoints: s.breakpoints.includes(uid)
        ? s.breakpoints.filter((id) => id !== uid)
        : [...s.breakpoints, uid],
      pausedAt: null,
    }));
    if (get().autoBake) void get().runRecipe();
  },

  selectStep: (uid) => set({ selectedStepUid: uid }),

  focusSearch: () => {
    const search = document.querySelector<HTMLInputElement>('input[type="search"]');
    search?.focus();
    search?.select();
  },

  updateArg: (uid, argName, patch) => {
    set((s) => ({
      steps: s.steps.map((step) =>
        step.uid === uid
          ? { ...step, args: step.args.map((a) => (a.name === argName ? { ...a, ...patch } : a)) }
          : step,
      ),
    }));
    if (get().autoBake) void get().runRecipe();
  },

  setSteps: (steps) => {
    set({ steps, pausedAt: null });
    if (get().autoBake) void get().runRecipe();
  },

  clearRecipe: () => {
    set({
      steps: [],
      bakeResult: null,
      breakpoints: [],
      selectedStepUid: null,
      pausedAt: null,
      suggestionDismissed: false,
    });
  },

  toggleFavourite: (opId) => {
    const favourites = get().favourites.includes(opId)
      ? get().favourites.filter((id) => id !== opId)
      : [...get().favourites, opId];
    set({ favourites });
    write(FAVOURITES_KEY, favourites);
  },

  /**
   * Runs the recipe up to the first breakpoint. Stepping is expressed by baking
   * a longer prefix rather than by teaching the engine about pausing — the
   * engine stays a pure function of (input, recipe).
   */
  runRecipe: async () => {
    const { input, inputEncoding, steps, breakpoints } = get();
    if (steps.length === 0) {
      set({ bakeResult: null, baking: false, pausedAt: null });
      return;
    }

    const stop = steps.findIndex((s) => !s.disabled && breakpoints.includes(s.uid));
    const limit = stop === -1 ? steps.length : stop;

    const token = ++bakeToken;
    set({ baking: true });
    const result = await bake(encodeInput(input, inputEncoding), {
      id: 'workspace',
      name: 'Recipe',
      steps: steps.slice(0, limit),
    });
    if (token !== bakeToken) return;

    set({ bakeResult: result, baking: false, pausedAt: stop === -1 ? null : stop });
  },

  stepOnce: async () => {
    const { input, inputEncoding, steps, pausedAt } = get();
    if (pausedAt === null || pausedAt >= steps.length) return;

    const next = pausedAt + 1;
    const token = ++bakeToken;
    set({ baking: true });
    const result = await bake(encodeInput(input, inputEncoding), {
      id: 'workspace',
      name: 'Recipe',
      steps: steps.slice(0, next),
    });
    if (token !== bakeToken) return;

    set({ bakeResult: result, baking: false, pausedAt: next >= steps.length ? null : next });
  },

  setAutoBake: (on) => {
    set({ autoBake: on });
    if (on) void get().runRecipe();
  },

  analyse: async () => {
    const { input, inputEncoding } = get();
    if (input.trim().length === 0) return;
    const bytes = encodeInput(input, inputEncoding);

    const token = ++analysisToken;
    set({ analysing: true });

    const [root, candidates, report] = await Promise.all([
      autoDecode(bytes),
      detect(bytes),
      analyse(bytes),
    ]);
    if (token !== analysisToken) return;

    // A different question from decoding: not "what is this wrapped in" but
    // "what is this". Cheap once the engine is loaded, which by here it is.
    const identification = await identify(bytes);
    const chain = toChain(root);

    set({
      root,
      chain,
      candidates,
      identification,
      analysis: report,
      activeLayerId: chain[chain.length - 1]?.id ?? root.id,
      analysing: false,
    });
  },

  applySuggestion: () => {
    const { chain } = get();
    const last = chain[chain.length - 1];
    if (!last || last.steps.length === 0) return;

    // The band stays visible afterwards — only its Apply button goes away. The
    // layer chain and the reasoning are why someone trusts the result, and
    // hiding them the moment they act on it would be backwards.
    set({
      steps: last.steps.map((s) => ({
        ...s,
        uid: `${s.opId}-${Math.random().toString(36).slice(2, 8)}`,
        args: s.args.map((a) => ({ ...a })),
      })),
      breakpoints: [],
      pausedAt: null,
    });
    void get().runRecipe();
  },

  /**
   * Runs the CTF search. Called when the view opens and when the input settles
   * while it is open — never on a keystroke nobody is watching.
   */
  runCtf: async () => {
    const { input, inputEncoding, ctfFormat } = get();
    if (input.trim().length === 0) {
      set({ ctf: null, ctfRunning: false });
      return;
    }

    const token = ++ctfToken;
    set({ ctfRunning: true });
    const report = await hints(encodeInput(input, inputEncoding), { format: ctfFormat });
    if (token !== ctfToken) return;

    set({ ctf: report, ctfRunning: false });
  },

  setCtfFormat: (format) => {
    set({ ctfFormat: format });
    write(CTF_FORMAT_KEY, format);
    if (get().view === 'ctf') void get().runCtf();
  },

  /**
   * Turns a hint into the recipe and shows it running.
   *
   * The hint already carries a recipe that works from the original input, so
   * this is a straight load — but the uids have to be fresh, or two hints
   * applied in a row would collide in the pipeline's keys.
   */
  applyHint: (hint) => {
    if (hint.steps.length === 0) return;
    set({
      steps: hint.steps.map((s) => ({
        ...s,
        uid: `${s.opId}-${Math.random().toString(36).slice(2, 8)}`,
        args: s.args.map((a) => ({ ...a })),
      })),
      breakpoints: [],
      pausedAt: null,
      view: 'workspace',
    });
    void get().runRecipe();
  },

  dismissSuggestion: () => set({ suggestionDismissed: true }),
  setActiveLayer: (id) => set({ activeLayerId: id }),
  toggleWhy: () => set((s) => ({ whyOpen: !s.whyOpen })),

  saveCurrentRecipe: (name) => {
    set({ savedRecipes: saveRecipe(name, get().steps) });
  },

  loadSavedRecipe: (id) => {
    const recipe = get().savedRecipes.find((r) => r.id === id);
    if (!recipe) return;
    set({ steps: instantiate(recipe), breakpoints: [], pausedAt: null, dialog: null });
    void get().runRecipe();
  },

  removeSavedRecipe: (id) => {
    set({ savedRecipes: deleteRecipe(id) });
  },

  setPaneWidth: (pane, width) => {
    const paneWidths = { ...get().paneWidths, [pane]: width };
    set({ paneWidths });
    write(PANES_KEY, paneWidths);
  },

  setMobilePane: (pane) => set({ mobilePane: pane }),
  setOutputMaximised: (maximised) => set({ outputMaximised: maximised }),

  setView: (view) => {
    set({ view });
    // Opening the view is the request. Anything else would either compute a
    // search nobody asked for, or show a stale one.
    if (view === 'ctf' && !get().ctfRunning) void get().runCtf();
  },

  setRailOpen: (open) => {
    set({ railOpen: open });
    write('decodebox-rail', open);
  },
  setRecipeView: (view) => set({ recipeView: view }),

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },

  setDialog: (dialog) => set({ dialog }),
}));

applyTheme(readTheme());
