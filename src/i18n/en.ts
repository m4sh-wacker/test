/**
 * Every user-facing string. Keeping them here means the interface can be
 * translated later without hunting through components.
 */
export const t = {
  app: {
    name: 'DecodeBox',
    org: 'OWASP',
    tagline: 'encode · decode · identify',
  },

  common: {
    close: 'Close',
  },

  header: {
    download: 'Download DecodeBox',
    theme: 'Switch theme',
    github: 'Source on GitHub',
    help: 'Keyboard shortcuts',
    share: 'Share this recipe',
    library: 'Saved recipes',
    workspace: 'Workspace',
    report: 'Report',
    ctf: 'Search — what to try next',
  },

  layout: {
    panes: 'Workspace panes',
    resizeOperations: 'Resize the operations pane',
    resizeRecipe: 'Resize the recipe pane',
    hideOperations: 'Hide the operations list',
    showOperations: 'Show the operations list',
  },

  operations: {
    title: 'Operations',
    search: 'Search operations',
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
    moveUp: 'Move step up',
    moveDown: 'Move step down',
    drag: 'Drag to reorder',
    disable: 'Disable step',
    enable: 'Enable step',
    setBreakpoint: 'Pause before this step',
    clearBreakpoint: 'Remove the pause',
    pausedAt: (n: number) => `paused before step ${n}`,
    step: 'Run one more step',
    bake: 'Bake',
    baking: 'Baking…',
    autoBaking: 'Auto-baking',
    autoBake: 'Bake automatically',
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
    examples: 'Try:',
    encoding: 'Read typed input as',
    encodingHint:
      'How the text you type becomes bytes. A loaded file is already bytes, so it is read raw.',
  },

  output: {
    title: 'Output',
    empty: 'Nothing yet. Paste something into the input.',
    fromDetection: 'auto-decoded',
    imageAlt: 'The decoded image',
    imageNote: 'Rendered locally. This image was never uploaded anywhere.',
    paused: 'paused',
    copy: 'Copy the output',
    copied: 'Copied',
    download: 'Download the output',
    wrap: 'Toggle word wrap',
    toInput: 'Move the output back to the input',
    maximise: 'Maximise the output',
    restore: 'Restore the input pane',
  },

  detection: {
    label: 'Detected',
    analysing: 'Analysing…',
    apply: 'Apply as recipe',
    why: 'Why?',
    dismiss: 'Dismiss this suggestion',
    whyTitle: (format: string) => `Why we think this is ${format}`,
    /** How the chain ends. Shown as the last node, so it reads as part of it. */
    endsIn: 'ends in',
    incomplete: 'more below',
    incompleteTitle: 'The chain stopped early — there may be another layer under this',
  },

  report: {
    title: 'Analysis report',
    summary: (formats: string, depth: number) =>
      `Unwrapped ${depth} ${depth === 1 ? 'layer' : 'layers'}: ${formats}.`,
    summaryPlain: 'No encoding detected. The content was scanned as it stands.',
    findings: 'Findings',
    indicators: 'Indicators',
    layers: 'Layers',
    took: 'Analysis time',
    structure: 'Structure',
    foundAt: 'Found at',
    type: 'Type',
    value: 'Value',
    copy: 'Copy report',
    copied: 'Copied',
    expand: 'Expand',
    collapse: 'Collapse',
    embedded: (label: string) => `${label} inside the parent`,
    embeddedAt: (offset: number) => `Found at offset ${offset} within the parent`,
    noFindings: 'Nothing here raised a security finding.',
    noIndicators: 'No addresses, hosts, paths or keys were found at any layer.',
    defangNote:
      'Indicators are shown defanged, so the report can be pasted into a ticket without anything becoming a live link.',
    truncated:
      'A limit was reached, so the tree is not exhaustive. Everything shown is real; there may be more below it.',
    emptyTitle: 'Nothing to analyse yet',
    emptyDetail:
      'Paste something into the input. DecodeBox will unwrap every layer it can find, then report what is inside and what is dangerous about it.',
    working: 'Analysing…',
    pending: 'Waiting for input.',
    privacy: 'Every layer above was decoded in this browser. Nothing was uploaded.',
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

  hash: {
    label: 'Looks like',
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
    nothingToSave: 'Build a recipe first, then save it here.',
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
      ['Ctrl / Cmd + Enter', 'Bake the recipe'],
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
