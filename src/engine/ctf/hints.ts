import type { Layer, RecipeStep } from '../types';
import { getOperation } from '../operations';
import { previewText } from '../core/bytes';
import { imageMime } from '../core/image';
import { asBytes } from '../core/bytes';
import { autoDecode } from '../detection/autoDecode';
import { terminusOf, toChain } from '../detection/chain';
import { detect } from '../detection/detect';
import { identify } from '../detection/identify';
import { containsMarker, readability } from '../detection/readability';
import { alphabetHints } from './alphabets';
import { caesarShift, ENGLISH_IC, indexOfCoincidence, isAlphabetic, letters, RANDOM_IC, vigenereKey } from './classical';
import { findFlags, mergeFlags } from './flags';
import {
  DEFAULT_CTF_OPTIONS,
  KIND_ORDER,
  type CtfOptions,
  type CtfReport,
  type FoundFlag,
  type Hint,
} from './types';

/**
 * CTF mode: what to try next, ranked, with the reason attached.
 *
 * The difference between this and detection is what counts as good enough.
 * Detection has to be right, because it drives an automatic decode and a wrong
 * answer wastes the analyst's trust. A hint only has to be *worth trying* — the
 * person reads the reason, decides in a second, and clicks or does not. So this
 * happily reports a Vigenère key it is 60% sure of, which detection never
 * would, and it reports the measurement that got there so the 60% is legible
 * rather than asserted.
 *
 * Everything runs over every layer of the decode chain, not just the input.
 * A flag three layers down is the normal case, not the exotic one.
 */

let counter = 0;

function step(opId: string, values: Record<string, string | number | boolean> = {}): RecipeStep | null {
  const op = getOperation(opId);
  if (!op) return null;
  return {
    uid: `ctf-${opId}-${(counter++).toString(36)}`,
    opId,
    args: op.args.map((a) => (a.name in values ? { ...a, value: values[a.name]! } : { ...a })),
    disabled: false,
  };
}

/**
 * Turns a statistical claim into a confidence, using the plaintext it produced.
 *
 * The statistics come first and do the real work, but they are an argument
 * about a short text and they can be made to agree with a wrong answer. What
 * settles it is whether the result contains a word English actually uses:
 * finding one raises the claim, and failing to find one lowers it without
 * throwing it away — a ciphertext with its spaces stripped has no `the ` in it
 * to find, and it is still the right answer.
 */
function confidenceFor(base: number, plaintext: string): number {
  if (containsMarker(plaintext)) return Math.min(0.92, base + 0.15);
  if (readability(plaintext) > 0.6) return base;
  return Math.max(0.3, base - 0.25);
}

/** Runs a candidate move so the hint can show what it produces. */
async function preview(input: string, added: RecipeStep): Promise<string | null> {
  const op = getOperation(added.opId);
  if (!op) return null;
  try {
    return previewText(await Promise.resolve(op.run(input, added.args)));
  } catch {
    // A move that throws is not a hint. Silence here is correct: the whole
    // point of running it was to find out.
    return null;
  }
}

interface Site {
  /** The value at this layer. */
  text: string;
  depth: number;
  /** How this layer was reached, for display. */
  path: string;
  /** The recipe that reaches this layer from the original input. */
  reach: RecipeStep[];
}

function copy(steps: RecipeStep[]): RecipeStep[] {
  return steps.map((s) => ({
    ...s,
    uid: `ctf-${s.opId}-${(counter++).toString(36)}`,
    args: s.args.map((a) => ({ ...a })),
  }));
}

/* ------------------------------------------------------------ the sources */

/** Alphabet-shape moves: binary, Morse, Base32, Baconian and friends. */
async function fromAlphabet(site: Site): Promise<Hint[]> {
  const hints: Hint[] = [];

  for (const found of alphabetHints(site.text)) {
    const added = step(found.opId);
    if (!added) continue;
    const shown = await preview(site.text, added);
    if (shown === null) continue;

    hints.push({
      id: `alphabet-${found.opId}-${site.depth}`,
      kind: 'shape',
      title: found.title,
      reason: `The alphabet says so: ${found.reason}.`,
      confidence: found.confidence,
      depth: site.depth,
      path: site.path,
      preview: shown,
      steps: [...copy(site.reach), added],
    });
  }

  return hints;
}

/** Caesar and Vigenère, recovered by measurement. */
async function fromClassical(site: Site): Promise<Hint[]> {
  if (!isAlphabetic(site.text)) return [];

  const hints: Hint[] = [];
  const ic = indexOfCoincidence(letters(site.text));

  const caesar = caesarShift(site.text);
  if (caesar) {
    const added = step(caesar.shift === 13 ? 'rot13' : 'rot', { Amount: caesar.shift });
    const shown = added ? await preview(site.text, added) : null;
    if (added && shown !== null) {
      const word = containsMarker(shown);
      hints.push({
        id: `caesar-${site.depth}`,
        kind: 'crack',
        title: caesar.shift === 13 ? 'Undo ROT13' : `Rotate the alphabet by ${caesar.shift}`,
        reason:
          `Index of coincidence ${ic.toFixed(4)}, close to English (${ENGLISH_IC}) rather than ` +
          `random (${RANDOM_IC.toFixed(4)}), so one alphabet was used throughout. Of the 25 ` +
          `shifts, ${caesar.shift} fits English letter frequencies best.` +
          (word ? ` The result contains "${word.trim()}".` : ''),
        confidence: confidenceFor(caesar.fit < 2 ? 0.8 : caesar.fit < 5 ? 0.65 : 0.45, shown),
        depth: site.depth,
        path: site.path,
        preview: shown,
        steps: [...copy(site.reach), added],
      });
    }
  }

  const vigenere = vigenereKey(site.text);
  if (vigenere) {
    const added = step('vigenere-decode', { Key: vigenere.key });
    const shown = added ? await preview(site.text, added) : null;
    if (added && shown !== null) {
      hints.push({
        id: `vigenere-${site.depth}`,
        kind: 'crack',
        title: `Decrypt as Vigenère with the key ${vigenere.key}`,
        reason:
          `Index of coincidence ${vigenere.ic.toFixed(4)} — near random (${RANDOM_IC.toFixed(4)}), ` +
          `so several alphabets. Splitting into ${vigenere.keyLength} columns raises it to ` +
          `${vigenere.columnIc.toFixed(4)}, close to English (${ENGLISH_IC}), so the key is ` +
          `${vigenere.keyLength} letters long. Each column then solves as a single shift.` +
          (containsMarker(shown) ? ` The result contains "${containsMarker(shown)!.trim()}".` : ''),
        // A key recovered this way is right far more often than not, but it is
        // still a statistical argument over a short text. It stays a hint.
        confidence: confidenceFor(0.7, shown),
        depth: site.depth,
        path: site.path,
        preview: shown,
        steps: [...copy(site.reach), added],
      });
    }
  }

  // Atbash leaves the index of coincidence untouched, so it cannot be told
  // apart from any other substitution by measurement — it has to be tried.
  const atbash = step('atbash');
  if (atbash) {
    const shown = await preview(site.text, atbash);
    if (shown !== null && readability(shown) > readability(site.text) + 0.12) {
      hints.push({
        id: `atbash-${site.depth}`,
        kind: 'crack',
        title: 'Apply Atbash',
        reason: 'Reversing the alphabet makes this markedly more readable than it is now.',
        confidence: 0.65,
        depth: site.depth,
        path: site.path,
        preview: shown,
        steps: [...copy(site.reach), atbash],
      });
    }
  }

  return hints;
}

/** Written backwards — cheap to check and common enough to be worth checking. */
async function fromReversal(site: Site, format: string): Promise<Hint[]> {
  const added = step('reverse');
  if (!added || site.text.length < 8) return [];

  const shown = await preview(site.text, added);
  if (shown === null) return [];

  const reversed = [...site.text].reverse().join('');
  const flagged = findFlags(reversed, site.depth, site.path, format).length > 0;
  const clearer = readability(reversed) > readability(site.text) + 0.15;
  if (!flagged && !clearer) return [];

  return [
    {
      id: `reverse-${site.depth}`,
      kind: flagged ? 'flag' : 'crack',
      title: 'Read it backwards',
      reason: flagged
        ? 'Reversing the text reveals something flag-shaped.'
        : 'Reversed, this reads as ordinary text; as it stands, it does not.',
      confidence: flagged ? 0.95 : 0.7,
      depth: site.depth,
      path: site.path,
      preview: shown,
      steps: [...copy(site.reach), added],
    },
  ];
}

/** Pictures: the moves that find data hidden in one. */
function fromImage(site: Site): Hint[] {
  const mime = imageMime(asBytes(site.text));
  if (!mime) return [];

  const moves: Array<[string, string, string, number, Record<string, string | number>]> = [
    [
      'extract-lsb',
      'Pull the least significant bits out',
      'The commonest place to hide a payload in a picture: one bit per channel per pixel, ' +
        'invisible to the eye and unchanged by anything but re-encoding.',
      0.7,
      {},
    ],
    [
      'view-bit-plane',
      'Look at the lowest bit plane',
      'Hidden data makes the lowest bit plane look like noise with structure in it, where an ' +
        'untouched photograph looks like noise with none.',
      0.6,
      { Bit: 0 },
    ],
    [
      'strings',
      'Pull the readable text out of the file',
      'Comments, chunk names and appended payloads all survive as printable runs.',
      0.5,
      {},
    ],
    [
      'extract-exif',
      'Read the metadata',
      'Camera fields are a favourite hiding place because most viewers never show them.',
      0.45,
      {},
    ],
  ];

  const hints: Hint[] = [];
  for (const [opId, title, reason, confidence, values] of moves) {
    const added = step(opId, values);
    if (!added) continue;
    hints.push({
      id: `image-${opId}-${site.depth}`,
      kind: 'inspect',
      title,
      reason: `This layer is ${mime}. ${reason}`,
      confidence,
      depth: site.depth,
      path: site.path,
      // Deliberately not run: these are slow on a large picture, and their
      // output is a picture, which a one-line preview cannot show anyway.
      preview: '',
      steps: [...copy(site.reach), added],
    });
  }
  return hints;
}

/**
 * The chain the engine already peeled, offered as one move.
 *
 * Easy to leave out, and wrong to: by the time the hints are built, the layers
 * have been decoded and their content searched, so the single most useful thing
 * anyone can do with this input has already been worked out. Not offering it
 * would mean a Base64 blob that unwrapped perfectly produced an empty list.
 */
function fromChain(sites: Site[], terminus: string | null): Hint[] {
  const last = sites[sites.length - 1];
  if (!last || sites.length < 2 || last.reach.length === 0) return [];

  const layers = sites.length - 1;
  return [
    {
      id: 'chain',
      kind: 'decode',
      title: `Peel ${last.path}`,
      reason:
        (layers === 1
          ? 'Detection unwrapped this layer on its own.'
          : `Detection unwrapped ${layers} layers on its own, re-detecting on the result each ` +
            'time.') + (terminus ? ` ${terminus}` : ''),
      confidence: 0.9,
      depth: 0,
      path: '',
      preview: previewText(last.text),
      steps: copy(last.reach),
    },
  ];
}

/** Whatever the ordinary detector found, restated as something to try. */
async function fromDetection(site: Site): Promise<Hint[]> {
  const candidates = await detect(site.text);

  return candidates.slice(0, 4).map((candidate) => ({
    id: `detect-${candidate.id}-${site.depth}`,
    kind: 'decode' as const,
    title: `Decode as ${candidate.format}`,
    reason: candidate.evidence.map((e) => e.label).join(', ') || 'Matches the shape of the format.',
    confidence: candidate.confidence,
    depth: site.depth,
    path: site.path,
    preview: candidate.preview,
    steps: [...copy(site.reach), ...copy(candidate.steps)],
  }));
}

/** What the value is, when that is the answer rather than a step towards it. */
function fromIdentification(site: Site): Hint[] {
  const found = identify(site.text);
  const best = found?.matches[0];
  if (!found || !best || best.confidence < 0.6) return [];

  return [
    {
      id: `identify-${site.depth}`,
      kind: 'identify',
      title: found.oneWay
        ? `This is ${best.name} — crack it, do not decode it`
        : `Identified as ${best.name}`,
      reason: found.oneWay
        ? `${best.reason}. One-way, so the move is a wordlist or a lookup, not a transformation.`
        : // The contexts are written as whole sentences and mostly punctuate
          // themselves, so only add the stop when one is actually missing.
          `${best.reason}.${best.context ? ` ${best.context.replace(/\.?$/, '.')}` : ''}`,
      confidence: best.confidence,
      depth: site.depth,
      path: site.path,
      preview: '',
      steps: [],
    },
  ];
}

/* ------------------------------------------------------------- the search */

/** Same move suggested at two depths is one move; keep the better-placed one. */
function dedupe(hints: Hint[]): Hint[] {
  const best = new Map<string, Hint>();
  for (const hint of hints) {
    const key = `${hint.kind}:${hint.title}`;
    const seen = best.get(key);
    if (!seen || hint.confidence > seen.confidence) best.set(key, hint);
  }
  return [...best.values()];
}

const MAX_HINTS = 24;

export async function ctfHints(
  input: string,
  options: Partial<CtfOptions> = {},
): Promise<CtfReport> {
  const started = performance.now();
  const opts = { ...DEFAULT_CTF_OPTIONS, ...options };
  const deadline = started + opts.budgetMs;

  if (input.trim().length === 0) {
    return { flags: [], hints: [], layers: 0, truncated: false, durationMs: 0 };
  }

  const root = await autoDecode(input, { maxDepth: opts.maxDepth });
  const layers: Layer[] = toChain(root);

  const sites: Site[] = layers.map((layer, index) => ({
    text: layer.output,
    depth: layer.depth,
    path:
      index === 0
        ? ''
        : layers
            .slice(1, index + 1)
            .map((l) => l.format)
            .join(' → '),
    reach: layer.steps,
  }));

  const flags: FoundFlag[] = [];
  const hints: Hint[] = [];
  let truncated = false;

  for (const site of sites) {
    flags.push(...findFlags(site.text, site.depth, site.path, opts.format));

    if (performance.now() > deadline) {
      truncated = true;
      break;
    }

    hints.push(...fromIdentification(site));
    hints.push(...fromImage(site));
    hints.push(...(await fromAlphabet(site)));
    hints.push(...(await fromClassical(site)));
    hints.push(...(await fromReversal(site, opts.format)));

    // The ordinary detector already ran on the input to build the chain, and
    // its answer for depth 0 is the chain itself — repeating it as a hint would
    // just be the first layer again. Deeper layers are a different matter: the
    // chain stopped there, so what the detector still sees is genuinely new.
    if (site.depth === sites.length - 1) {
      hints.push(...(await fromDetection(site)));
    }
  }

  hints.push(...fromChain(sites, terminusOf(root)?.note ?? null));

  const merged = mergeFlags(flags);

  // A flag that was actually found outranks everything, because it is not a
  // suggestion at all — it is the answer.
  const flagHints: Hint[] = merged.slice(0, 4).map((flag, index) => ({
    id: `flag-${index}`,
    kind: 'flag' as const,
    title: flag.text,
    reason: flag.known
      ? `Flag-shaped, with a prefix this competition or a well-known one uses${
          flag.depth > 0 ? `, found ${flag.depth} ${flag.depth === 1 ? 'layer' : 'layers'} down` : ''
        }.`
      : `Flag-shaped: a short prefix, a brace, and content${
          flag.depth > 0 ? `, found ${flag.depth} ${flag.depth === 1 ? 'layer' : 'layers'} down` : ''
        }.`,
    confidence: flag.known ? 0.98 : 0.75,
    depth: flag.depth,
    path: flag.path,
    preview: flag.text,
    steps: copy(sites[flag.depth]?.reach ?? []),
  }));

  const ranked = dedupe([...flagHints, ...hints]).sort(
    (a, b) =>
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      b.confidence - a.confidence ||
      a.depth - b.depth,
  );

  return {
    flags: merged,
    hints: ranked.slice(0, MAX_HINTS),
    layers: sites.length,
    truncated: truncated || ranked.length > MAX_HINTS,
    durationMs: performance.now() - started,
  };
}
