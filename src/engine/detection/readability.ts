/**
 * How much a byte string looks like human-readable text.
 *
 * Brute force needs a scoring function that can pick one plausible plaintext
 * out of 255 candidates, and printable-character ratio alone cannot: every
 * single-byte XOR of readable text is *also* mostly printable for many keys.
 * Letter and space frequency is what separates real text from noise that
 * happens to land in the printable range.
 */

/** Rough English letter frequency, including the space, which dominates. */
const EXPECTED: Record<string, number> = {
  ' ': 0.18,
  e: 0.1,
  t: 0.075,
  a: 0.065,
  o: 0.062,
  i: 0.057,
  n: 0.057,
  s: 0.053,
  r: 0.05,
  h: 0.05,
  l: 0.033,
  d: 0.032,
  c: 0.023,
  u: 0.023,
  m: 0.02,
  f: 0.02,
  p: 0.016,
  g: 0.016,
  w: 0.016,
  y: 0.015,
  b: 0.012,
  v: 0.008,
  k: 0.006,
  x: 0.002,
  j: 0.001,
  q: 0.001,
  z: 0.001,
};

/**
 * 0..1. Above about 0.6 the text is almost certainly meaningful; below 0.3 it
 * is noise. Tuned to be forgiving of code and structured data, which score
 * lower than prose but are still what an analyst wants to see.
 */
export function readability(text: string): number {
  if (text.length === 0) return 0;

  const sample = text.slice(0, 2048);
  let printable = 0;
  let controls = 0;
  const counts = new Map<string, number>();

  for (const char of sample) {
    const code = char.charCodeAt(0);
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126)) printable++;
    else if (code < 32 || code === 127) controls++;

    const lower = char.toLowerCase();
    if (EXPECTED[lower] !== undefined) counts.set(lower, (counts.get(lower) ?? 0) + 1);
  }

  const printableRatio = printable / sample.length;
  // Any run of control bytes rules text out quickly; real text has almost none.
  if (controls / sample.length > 0.05) return 0;
  if (printableRatio < 0.9) return printableRatio * 0.3;

  // Chi-squared style comparison against expected frequencies, inverted so
  // that a close match scores high.
  let divergence = 0;
  for (const [char, expected] of Object.entries(EXPECTED)) {
    const observed = (counts.get(char) ?? 0) / sample.length;
    divergence += Math.abs(observed - expected);
  }

  // A perfect match gives 0 divergence; unrelated bytes land near 1.2.
  const frequencyScore = Math.max(0, 1 - divergence / 1.1);

  // Structured data (JSON, code, hex) is readable but frequency-atypical, so
  // give printability a floor contribution rather than trusting frequency alone.
  return Math.min(1, printableRatio * 0.35 + frequencyScore * 0.65);
}

/** Words common enough that finding one is meaningful evidence on its own. */
const MARKERS = [
  'the ',
  ' and ',
  'http',
  'select ',
  'function',
  'password',
  'error',
  'true',
  'false',
  'null',
  'user',
  'admin',
  '<?xml',
  '<html',
  'begin ',
];

export function containsMarker(text: string): string | null {
  const lower = text.slice(0, 4096).toLowerCase();
  return MARKERS.find((marker) => lower.includes(marker)) ?? null;
}
