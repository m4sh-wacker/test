import type { Candidate, Evidence, RecipeStep } from '../types';
import { asBytes, bytesToLatin1, previewText } from '../core/bytes';
import { containsMarker, readability } from './readability';

/**
 * The pass that runs when nothing declared can explain the input.
 *
 * A single-byte XOR is the most common cheap obfuscation in malware and CTF
 * traffic, and it is invisible to every criteria-based detector: the output has
 * no signature, no alphabet and no structure to match. The only way to find it
 * is to try all 255 keys and judge the results — which is exactly what an
 * analyst does by hand, just slower.
 *
 * It is a last resort rather than part of the main pass, because it can always
 * produce *something*, and something is not the same as evidence.
 */

/** Enough to judge readability without spending time on a large file. */
const SAMPLE = 2048;
/** Below this the result is not convincing enough to be worth showing. */
const MIN_READABILITY = 0.62;

function xorAll(bytes: Uint8Array, key: number): string {
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[i]! ^ key;
  return bytesToLatin1(out);
}

function rotate(text: string, amount: number): string {
  return text.replace(/[a-zA-Z]/g, (char) => {
    const base = char <= 'Z' ? 65 : 97;
    return String.fromCharCode(((char.charCodeAt(0) - base + amount) % 26) + base);
  });
}

function evidenceFor(output: string, score: number, how: string): Evidence[] {
  const evidence: Evidence[] = [
    {
      label: `readability ${score.toFixed(2)}`,
      detail:
        `Of every key tried, this one produced the most text-like result: letter and space ` +
        `frequencies close to ordinary writing rather than the flat distribution of noise.`,
      weight: 0.8,
    },
    {
      label: how,
      detail:
        'Found by trying every possibility rather than by recognising a signature. ' +
        'Obfuscation of this kind leaves nothing to recognise.',
      weight: 0.5,
    },
  ];

  const marker = containsMarker(output);
  if (marker) {
    evidence.unshift({
      label: `contains "${marker.trim()}"`,
      detail:
        `The decoded text contains "${marker.trim()}", a sequence that essentially never appears ` +
        'by chance. This is what turns a plausible guess into a confident one.',
      weight: 0.95,
    });
  }

  return evidence;
}

function uid(opId: string): string {
  return `${opId}-${Math.random().toString(36).slice(2, 9)}`;
}

/** The XOR key that worked, as a step the user can then edit by hand. */
function xorStep(key: string): RecipeStep {
  return {
    uid: uid('xor'),
    opId: 'xor',
    args: [
      {
        name: 'Key',
        type: 'toggleString',
        value: key,
        toggleValues: ['UTF-8', 'Hex', 'Base64'],
        toggleValue: 'Hex',
      },
    ],
    disabled: false,
  };
}

function rotStep(amount: number): RecipeStep {
  if (amount === 13) {
    return { uid: uid('rot13'), opId: 'rot13', args: [], disabled: false };
  }
  return {
    uid: uid('rot'),
    opId: 'rot',
    args: [{ name: 'Amount', type: 'number', value: amount, min: 1, max: 25 }],
    disabled: false,
  };
}

export function bruteForce(input: string): Candidate[] {
  const sample = input.length > SAMPLE ? input.slice(0, SAMPLE) : input;
  if (sample.length < 8) return [];

  const bytes = asBytes(sample);
  const found: Candidate[] = [];

  // Single-byte XOR. Key 0 is the identity, so it is not a finding.
  let bestKey = -1;
  let bestScore = 0;
  let bestOutput = '';

  for (let key = 1; key < 256; key++) {
    const output = xorAll(bytes, key);
    const score = readability(output);
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
      bestOutput = output;
    }
  }

  if (bestKey !== -1 && bestScore >= MIN_READABILITY) {
    const hex = bestKey.toString(16).padStart(2, '0');
    found.push({
      id: 'brute-xor',
      format: `XOR (key 0x${hex.toUpperCase()})`,
      // Capped below what a real signature earns: this is a strong guess, not
      // a structural match, and the confidence should say so.
      confidence: Math.min(0.82, 0.45 + bestScore * 0.45),
      evidence: evidenceFor(bestOutput, bestScore, `tried all 255 single-byte keys`),
      preview: previewText(bestOutput),
      steps: [xorStep(hex)],
    });
  }

  // Rotation, but only where there are letters to rotate.
  if (/[a-zA-Z]{4}/.test(sample)) {
    let bestRot = 0;
    let bestRotScore = readability(sample);
    let bestRotOutput = '';

    for (let n = 1; n < 26; n++) {
      const output = rotate(sample, n);
      const score = readability(output);
      if (score > bestRotScore) {
        bestRotScore = score;
        bestRot = n;
        bestRotOutput = output;
      }
    }

    if (bestRot !== 0 && bestRotScore >= MIN_READABILITY) {
      found.push({
        id: 'brute-rot',
        format: bestRot === 13 ? 'ROT13' : `ROT${bestRot}`,
        confidence: Math.min(0.8, 0.42 + bestRotScore * 0.45),
        evidence: evidenceFor(bestRotOutput, bestRotScore, `tried all 25 rotations`),
        preview: previewText(bestRotOutput),
        steps: [rotStep(bestRot)],
      });
    }
  }

  return found.sort((a, b) => b.confidence - a.confidence);
}
