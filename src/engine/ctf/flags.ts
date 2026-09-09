import type { FoundFlag } from './types';

/**
 * Finding the flag.
 *
 * Every flag in every competition has the same shape — a short prefix, a brace,
 * some content, a closing brace — because that shape is what makes a flag
 * greppable. So the search is for the shape, with a list of well-known prefixes
 * used only to rank what it finds, never to limit it. A tool that only knew
 * `flag{...}` would miss the flag on most sites it was pointed at.
 */

/** Prefixes common enough that finding one is close to proof. */
const KNOWN = new Set(
  [
    'flag',
    'ctf',
    'key',
    'picoctf',
    'htb',
    'thm',
    'tryhackme',
    'hackthebox',
    'sec',
    'uiuctf',
    'actf',
    'dctf',
    'ractf',
    'csawctf',
    'gctf',
    'justctf',
    'openecsc',
    'owasp',
    'decodebox',
  ].map((p) => p.toLowerCase()),
);

/**
 * A prefix, a brace, content, a brace. The content excludes braces so nesting
 * cannot run away, and is bounded so a file full of `{` cannot make the match
 * quadratic.
 */
const SHAPE = /\b([A-Za-z][A-Za-z0-9_-]{1,23})\{([^{}\r\n]{1,256})\}/g;

/** Escapes a user-supplied prefix so a stray `(` cannot break the pattern. */
function literal(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Flags in one layer.
 *
 * `format` is the prefix the competition announced, if the user gave one. It
 * does not narrow the search — it promotes an exact match to certain, which is
 * what the user asked for by typing it.
 */
export function findFlags(text: string, depth: number, path: string, format = ''): FoundFlag[] {
  const found: FoundFlag[] = [];
  const wanted = format.trim().toLowerCase();

  for (const match of text.matchAll(SHAPE)) {
    const prefix = match[1]!.toLowerCase();
    found.push({
      text: match[0],
      depth,
      path,
      known: prefix === wanted || KNOWN.has(prefix),
    });
  }

  // A declared format that is not brace-shaped still deserves a search: some
  // competitions use `FLAG-xxxx` or a bare token.
  if (wanted && !found.some((f) => f.text.toLowerCase().startsWith(wanted))) {
    const loose = new RegExp(`${literal(format.trim())}[^\\s\\r\\n]{2,256}`, 'gi');
    for (const match of text.matchAll(loose)) {
      found.push({ text: match[0], depth, path, known: true });
    }
  }

  return found;
}

/** Same flag at several depths is one flag; keep the shallowest sighting. */
export function mergeFlags(flags: FoundFlag[]): FoundFlag[] {
  const best = new Map<string, FoundFlag>();
  for (const flag of flags) {
    const seen = best.get(flag.text);
    if (!seen || flag.depth < seen.depth) best.set(flag.text, flag);
  }
  return [...best.values()].sort(
    (a, b) => Number(b.known) - Number(a.known) || a.depth - b.depth,
  );
}
