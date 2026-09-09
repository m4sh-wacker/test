import type { OperationDef, RecipeStep } from '../engine';

/**
 * Share links.
 *
 * A recipe is worth passing to a colleague; that is most of what makes a tool
 * like this collaborative. The input usually is not — it is frequently a
 * credential, a token, or a live sample, and a URL is the least private place
 * it could end up. So the recipe travels by default and the input only when the
 * person sharing says so, and is told what that means.
 *
 * The payload is deflated before encoding. Recipes are repetitive JSON, so this
 * routinely cuts the link to a third of its length and keeps it inside what
 * chat clients and mail agents will carry without wrapping.
 */

const VERSION = 1;
const PREFIX = '#s=';

interface SharedStep {
  op: string;
  /** Only values that differ from the operation's default are carried. */
  args?: Record<string, string | number | boolean>;
  toggles?: Record<string, string>;
  off?: true;
}

interface SharePayload {
  v: number;
  s: SharedStep[];
  i?: string;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pipe(bytes: BlobPart, stream: CompressionStream | DecompressionStream) {
  const source = new Blob([bytes]).stream();
  const piped = source.pipeThrough(stream as ReadableWritablePair<Uint8Array, Uint8Array>);
  return new Uint8Array(await new Response(piped).arrayBuffer());
}

export async function encodeShare(
  steps: RecipeStep[],
  operations: OperationDef[],
  input?: string,
): Promise<string> {
  const shared: SharedStep[] = steps.map((step) => {
    const definition = operations.find((op) => op.id === step.opId);
    const entry: SharedStep = { op: step.opId };

    for (const arg of step.args) {
      const original = definition?.args.find((a) => a.name === arg.name);
      if (original && original.value !== arg.value) {
        entry.args ??= {};
        entry.args[arg.name] = arg.value;
      }
      if (arg.toggleValue && original?.toggleValue !== arg.toggleValue) {
        entry.toggles ??= {};
        entry.toggles[arg.name] = arg.toggleValue;
      }
    }

    if (step.disabled) entry.off = true;
    return entry;
  });

  const payload: SharePayload = { v: VERSION, s: shared };
  if (input !== undefined && input.length > 0) payload.i = input;

  const json = JSON.stringify(payload);
  const compressed = await pipe(json, new CompressionStream('deflate-raw'));
  return PREFIX + toBase64Url(compressed);
}

export interface DecodedShare {
  steps: RecipeStep[];
  input?: string;
}

/**
 * Rebuilds a recipe from a link. Returns null rather than throwing on anything
 * malformed — a share link is untrusted input like any other, and a bad one
 * should leave the workspace empty, not break it.
 */
export async function decodeShare(
  hash: string,
  operations: OperationDef[],
): Promise<DecodedShare | null> {
  if (!hash.startsWith(PREFIX)) return null;

  let payload: SharePayload;
  try {
    const bytes = fromBase64Url(hash.slice(PREFIX.length));
    const json = new TextDecoder().decode(
      await pipe(bytes as BlobPart, new DecompressionStream('deflate-raw')),
    );
    const parsed: unknown = JSON.parse(json);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !Array.isArray((parsed as SharePayload).s)
    ) {
      return null;
    }
    payload = parsed as SharePayload;
  } catch {
    return null;
  }

  if (payload.v !== VERSION) return null;

  const steps: RecipeStep[] = [];
  for (const entry of payload.s) {
    const definition = operations.find((op) => op.id === entry.op);
    // Silently skip operations this build does not have, rather than failing the
    // whole link. A partially rebuilt recipe is more useful than none.
    if (!definition) continue;

    steps.push({
      uid: `${entry.op}-${Math.random().toString(36).slice(2, 9)}`,
      opId: entry.op,
      args: definition.args.map((arg) => ({
        ...arg,
        value: entry.args?.[arg.name] ?? arg.value,
        toggleValue: entry.toggles?.[arg.name] ?? arg.toggleValue,
      })),
      disabled: entry.off === true,
    });
  }

  return { steps, input: typeof payload.i === 'string' ? payload.i : undefined };
}

export function shareUrl(fragment: string): string {
  return `${location.origin}${location.pathname}${fragment}`;
}
