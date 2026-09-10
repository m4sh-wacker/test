/**
 * Every user-facing string. Keeping them here means the interface can be
 * translated later without hunting through components.
 */
export const t = {
  app: {
    name: 'DecodeBox',
    org: 'OWASP',
    tagline: 'encode · decode · identify',
    /*
     * What the project is, stated exactly.
     *
     * "An OWASP Foundation Project" is a description of governance and is true.
     * "Official OWASP tool" would be a claim about endorsement that no project
     * at this stage is entitled to make, so it is not made anywhere.
     */
    affiliation: 'An OWASP Foundation Project',
    licence: 'Apache-2.0',
  },

  common: {
    close: 'Close',
  },

  header: {
    download: 'Download DecodeBox',
    theme: 'Switch theme',
    github: 'Source on GitHub',
    recipeActions: 'Recipe actions',
    viewActions: 'View',
    helpActions: 'Help and source',
    help: 'Keyboard shortcuts',
    share: 'Share this recipe',
    library: 'Saved recipes',
    workspace: 'Workspace',
    ctf: 'Search — what to try next',
  },

  layout: {
    panes: 'Workspace panes',
    skipToInput: 'Skip to input',
    resizeOperations: 'Resize the operations pane',
    resizeRecipe: 'Resize the recipe pane',
    resizeInput: 'Resize the input pane — drag, or use the arrow keys',
    resizeRecipeHeight: 'Resize the recipe pane — drag, or use the arrow keys',
    hideOperations: 'Hide the operations list',
    showOperations: 'Show the operations list',
  },

  operations: {
    title: 'Operations',
    search: 'Search operations',
    searchHint: 'Type to filter. Press Enter to add the first match to the recipe.',
    shortcut: 'Ctrl K',
    clear: 'Clear the search',
    matches: (shown: number, total: number) => `${shown} of ${total}`,
    enterAdds: (name: string) => `Enter adds ${name}`,
    noResults: 'Nothing matches that.',
    loading: 'Loading the engine…',
    hint: 'Click or drag an operation into the recipe',
    star: (name: string) => `Add ${name} to favourites`,
    unstar: (name: string) => `Remove ${name} from favourites`,
  },

  recipe: {
    title: 'Recipe',
    empty: 'No operations yet.',
    emptyHint: 'Drag one in from the left, or apply what detection found.',
    clear: 'Clear the recipe',
    clearShort: 'clear',
    add: 'Add',
    addFirst: 'Add an operation',
    noArguments: 'This operation takes no arguments.',
    mobileHint: 'Add operations from the Operations tab, then tap one here to change its settings.',
    save: 'Save or load a recipe',
    remove: 'Remove step',
    dropToRemove: 'Release outside the recipe to remove this step',
    moveUp: 'Move step up',
    moveDown: 'Move step down',
    drag: 'Drag to reorder',
    disable: 'Disable step',
    enable: 'Enable step',
    setBreakpoint: 'Pause before this step',
    clearBreakpoint: 'Remove the pause',
    pausedAt: (n: number) => `paused before step ${n}`,
    step: 'Run one more step',
    /*
     * "Bake" is CyberChef's word for this and carries none of its meaning to
     * anyone who has not used CyberChef. Running a recipe is running it.
     */
    bake: 'Run',
    rerun: 'Run again',
    baking: 'Running…',
    autoBaking: 'Runs automatically',
    autoBake: 'Run automatically',
    autoBakeHint:
      'Re-runs the recipe whenever the input or a step changes. Turn it off for a recipe that is slow or has side effects you would rather trigger yourself.',
    showText: 'Edit the recipe as text',
    showVisual: 'Back to the step list',
    textLabel: 'Recipe as JSON',
    textHint: 'Edit as JSON. Only arguments that differ from the default are shown.',
    stepFailed: (n: number) => `Step ${n} failed`,
  },

  input: {
    title: 'Input',
    placeholder: 'Paste anything — Base64, hex, a JWT, a URL-encoded payload, a hexdump…',
    clear: 'Clear the input',
    loadFile: 'Load a file',
    drop: 'Drop to load',
    encoding: 'Read typed input as',
    encodingHint:
      'How the text you type becomes bytes. A loaded file is already bytes, so it is read raw.',
  },

  output: {
    title: 'Output',
    views: 'How to read the output',
    viewNames: { raw: 'Raw', hexdump: 'Hexdump', base64: 'Base64' },
    viewNote: 'a view, not a recipe step',
    fromDetection: 'auto-decoded',
    fromDetectionHint:
      'This is what detection unwrapped, not the recipe. Use as recipe to make it editable.',
    imageAlt: 'The decoded image',
    imageNote: 'Rendered locally. This image was never uploaded anywhere.',
    paused: 'paused',
    copy: 'Copy the output',
    copyShort: 'Copy',
    copied: 'Copied',
    download: 'Download the output',
    wrap: 'Toggle word wrap',
    toInput: 'Move the output back to the input',
    maximise: 'Maximise the output',
    restore: 'Restore the input pane',
  },

  detection: {
    region: 'What DecodeBox detected',
    label: 'Detected',
    analysing: 'Identifying…',
    /*
     * "Apply as recipe" described the mechanism. What the reader wants to know
     * is what they get: the steps land in the recipe, editable, and from then
     * on the chain is theirs rather than the engine's.
     */
    apply: 'Use as recipe',
    applyHint: 'Put these steps in the recipe, where you can edit and re-run them',
    layers: (n: number) => `${n} ${n === 1 ? 'layer' : 'layers'}`,
    why: 'Evidence',
    whyHint: 'The measurements behind this identification',
    dismiss: 'Hide this detection',
    whyTitle: (format: string) => `Why we think this is ${format}`,
    /** How the chain ends. Shown as the last node, so it reads as part of it. */
    endsIn: 'ends in',
    incomplete: 'more below',
    /*
     * A heading, not a sentence: this is a state the reader can act on, and the
     * action sits beside it. The old copy — "The chain stopped early, there may
     * be another layer under this" — read as a footnote and was treated as one.
     */
    incompleteTitle: 'More layers may exist',
    deeper: (depth: number) => `Look deeper than ${depth}`,
    deepening: 'Looking…',
  },

  /*
   * Confidence is not progress.
   *
   * It was drawn as a bar that fills left to right, directly above a pane whose
   * whole job is running things, and it was read as a progress bar. The word
   * alongside the number is what carries the meaning when the colours cannot.
   */
  confidence: {
    label: 'Confidence',
    explain: 'How sure the identification is — not how far it has got',
    aria: (percent: number, band: string) =>
      `Detection confidence ${percent} percent, ${band}`,
    high: 'near certain',
    good: 'strong',
    medium: 'reasonable',
    low: 'weak',
    weak: 'a guess',
  },

  /*
   * What survived the report view.
   *
   * These are the strings the Search view uses to present the analysis engine's
   * findings and indicators. The rest of the report's vocabulary went with the
   * view itself; a string nothing renders is a claim about an interface that
   * does not exist.
   */
  report: {
    findings: 'Findings',
    indicators: 'Indicators',
    layers: 'Layers',
    foundAt: 'Found at',
    noIndicators: 'No addresses, hosts, paths or keys were found at any layer.',
    defangNote:
      'Indicators are shown defanged, so they can be pasted into a ticket without anything becoming a live link.',
  },

  /*
   * Labelled "Search" throughout, though the code still calls it ctf.
   *
   * The feature grew out of CTF work and the internals say so — the engine
   * module, the store field, the tests. But "CTF" names an audience rather than
   * a job, and the job is what a button has to say: this searches every layer
   * for anything worth finding and ranks what to try next, which is as useful
   * on an incident payload as on a competition one.
   *
   * The label lives here precisely so it can differ from the identifier.
   */
  ctf: {
    title: 'Search',
    tab: 'Search',
    subtitle: 'What to try next, ranked, with the reason for each.',
    emptyTitle: 'Nothing to work on yet',
    emptyDetail:
      'Paste something into the input. DecodeBox will peel what it can, search every layer for ' +
      'anything worth finding, and rank what is worth trying on what is left.',
    working: 'Searching…',
    run: 'Search again',
    format: 'Flag format',
    formatHint:
      'The prefix this competition uses, e.g. picoCTF. Optional — the search finds the shape ' +
      'either way, and this only promotes an exact match.',
    flagsFound: (n: number) => `${n} ${n === 1 ? 'flag' : 'flags'} found`,
    noFlags: 'No flag found in any layer.',
    hints: 'Worth trying',
    noHints: 'Nothing here suggests a next move.',
    apply: 'Apply',
    applyHint: 'Load this as the recipe',
    copy: 'Copy',
    copied: 'Copied',
    copyReport: 'Copy as Markdown',
    atInput: 'in the input',
    atDepth: (n: number, path: string) => `${n} ${n === 1 ? 'layer' : 'layers'} down · ${path}`,
    layers: (n: number) => `${n} ${n === 1 ? 'layer' : 'layers'} searched`,
    truncated: 'A limit was reached, so this list is not exhaustive.',
    noSteps: 'Nothing to click — this one is a statement, not a move.',
    kinds: {
      flag: 'flag',
      decode: 'decode',
      crack: 'cracked',
      shape: 'shape',
      identify: 'identity',
      inspect: 'inspect',
    },
    privacy: 'Every layer was decoded in this browser. Nothing was uploaded.',
  },

  /*
   * Find in every layer.
   *
   * The view is called Search and its main control was a field for a CTF flag
   * prefix, which is a niche setting rather than a search. This is the search.
   */
  /*
   * The entropy profile.
   *
   * Only shown when there are enough bytes for it to mean something. Its words
   * say "consistent with", never "is": entropy is evidence about a block, and a
   * short run of unlucky text can look like a cipher.
   */
  entropy: {
    label: 'Shape',
    hint: 'hover a block',
    aria: (blocks: number, standout: number) =>
      standout > 0
        ? `Entropy profile, ${blocks} blocks, ${standout} dense ${standout === 1 ? 'region' : 'regions'} that stand out`
        : `Entropy profile, ${blocks} blocks, nothing standing out`,
    bands: {
      sparse: 'padding or repetition',
      text: 'consistent with text',
      encoded: 'consistent with encoded data',
      dense: 'consistent with compression or encryption',
    },
    standout: (n: number) => `${n} dense ${n === 1 ? 'region' : 'regions'}`,
    buried: 'Dense inside ordinary content:',
  },

  find: {
    region: 'Find in every layer',
    placeholder: 'Find in every layer — including the ones not decoded yet',
    regex: 'Read the query as a regular expression',
    regexHint: 'Regular expression. Off means the query is matched literally.',
    caseSensitive: 'Match case',
    caseHint: 'Match upper and lower case exactly',
    clear: 'Clear the search',
    badPattern: 'That is not a pattern this can compile.',
    none: 'Not found at any layer.',
    count: (hits: number, layers: number) =>
      `${hits} ${hits === 1 ? 'match' : 'matches'} in ${layers} ${layers === 1 ? 'layer' : 'layers'}`,
    inInput: 'in the input',
    depth: (n: number) => `${n} deep`,
    at: (offset: number) => `at ${offset}`,
    open: 'Open',
    openHint: 'Load the recipe that reaches this layer and go to the workspace',
    embedded: 'embedded — no linear recipe',
  },

  hash: {
    label: 'Looks like',
    salted: 'salted',
    unsalted: 'no salt',
    saltIs: 'salt',
    alsoPossible: 'Could also be',
    oneWay:
      'Hashes are one-way. There is nothing here to decode — you would need a wordlist or a lookup service.',
  },

  share: {
    title: 'Share',
    subtitle: 'The link rebuilds this recipe in someone else’s browser.',
    includeInput: 'Include the input as well',
    includeInputHint: 'Off by default, so the link carries only the recipe.',
    inputWarning:
      'The input becomes part of the URL. Links get logged by proxies, chat clients and browser history — do not do this with credentials or live samples.',
    link: 'Link',
    copy: 'Copy',
    copied: 'Copied',
    length: (n: number) => `${n} characters`,
    tooLong: (n: number) => `${n} characters — some clients will truncate this`,
  },

  library: {
    title: 'Recipes',
    subtitle: 'Saved in this browser only.',
    namePlaceholder: 'Name this recipe',
    save: 'Save',
    nothingToSave: 'Nothing to save yet. Add an operation to the recipe, or paste something and let detection find one.',
    /*
     * Auto-decoding does not fill the recipe — the chain it finds is a
     * suggestion until somebody applies it. That is the right default, and it
     * also meant pasting a payload, watching it unwrap, and then finding Save
     * greyed out with no clue why. The recipe on offer is named, so saving it
     * is a decision rather than a surprise.
     */
    saveDetected: (chain: string) => `Save what detection found: ${chain}`,
    detectedNote: 'The recipe is empty, so this saves the chain detection found.',
    saved: 'Saved',
    empty: 'Nothing saved yet.',
    remove: (name: string) => `Delete ${name}`,
    storageNote: 'Recipes live in this browser’s storage. Clearing site data removes them.',
  },

  status: {
    ready: 'Ready',
    working: 'Working',
    failed: 'Failed',
    paused: 'Paused',
    input: 'in',
    output: 'out',
    lines: (n: number) => `${n} ${n === 1 ? 'line' : 'lines'}`,
    steps: 'steps',
    privacy: 'Everything runs in your browser — nothing is uploaded',
    owasp: 'An OWASP Foundation Project',
    source: 'Source',
    licence: 'Apache-2.0',
  },

  download: {
    title: 'Download DecodeBox',
    lead:
      'The whole application in a single HTML file. Save it, double-click it, and it runs — no ' +
      'server, no install, no network. It is the same build as this page.',
    privacy:
      'DecodeBox has no server-side component, and no operation in it makes a network request. ' +
      'That is true of this page and of the copy you download, and you can confirm it in your ' +
      'browser’s network tab.',
    airgap:
      'Useful where getting a build toolchain onto a machine is harder than getting one file onto ' +
      'it — an isolated network, a locked-down laptop, an incident-response box.',
    stale:
      'A downloaded copy never updates itself. It will not get fixes or new operations until you ' +
      'download it again.',
    worker:
      'One difference from this page: a single file cannot start a Web Worker, so very large ' +
      'inputs are processed on the main thread and the tab may pause while they run.',
    version: 'Version',
    built: 'Built',
    button: 'Download the file',
    size: 'about 1 MB',
  },

  help: {
    title: 'Keyboard shortcuts',
    note: 'Steps can also be reordered with the arrow buttons, so nothing here needs a mouse.',
    shortcuts: [
      ['Ctrl / Cmd + Enter', 'Run the recipe'],
      ['Ctrl / Cmd + Shift + C', 'Copy the output'],
      ['Ctrl / Cmd + K', 'Focus the operation search'],
      ['Ctrl / Cmd + S', 'Save or load a recipe'],
      ['Ctrl / Cmd + L', 'Share this recipe'],
      ['Esc', 'Close any open dialog'],
    ] as const,
  },

  error: {
    boundary: 'Something broke',
    boundaryDetail:
      'DecodeBox hit an unexpected error. Your data never left the browser. Reloading should clear it.',
    reload: 'Reload',
  },
} as const;
