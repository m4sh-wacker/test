import type { WorkerRequest, WorkerResponse } from './engine.worker';

/**
 * The worker client.
 *
 * Small inputs stay on the main thread: posting a message and structured-cloning
 * the result back costs more than decoding a hundred-byte token, and the
 * round trip would show up as latency on every keystroke. Past the threshold
 * the cost inverts and the worker is what keeps the interface painting.
 *
 * If the worker cannot start — an old browser, a strict environment, a build
 * served from file:// — every call falls back to running in place. A tool that
 * refuses to work because an optimisation is unavailable has the trade backwards.
 */

/**
 * Omit over a union has to distribute, or TypeScript collapses the four request
 * shapes into their common fields and rejects every payload-carrying call.
 */
type Unposted<T> = T extends unknown ? Omit<T, 'id'> : never;
export type WorkerCall = Unposted<WorkerRequest>;

/** Below this, the message round trip costs more than the work itself. */
export const WORKER_THRESHOLD = 64 * 1024;

let worker: Worker | null = null;
let unavailable = false;
let nextId = 1;

const pending = new Map<number, { resolve: (value: unknown) => void; reject: (reason: Error) => void }>();

function ensureWorker(): Worker | null {
  if (unavailable) return null;
  if (worker) return worker;

  try {
    worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });

    worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      const waiting = pending.get(response.id);
      if (!waiting) return;
      pending.delete(response.id);
      if (response.ok) waiting.resolve(response.result);
      else waiting.reject(new Error(response.error));
    });

    worker.addEventListener('error', () => {
      // Whatever broke, the main thread can still do the work. Reject what is
      // in flight and stop trying to use the worker for anything else.
      for (const waiting of pending.values()) waiting.reject(new Error('The engine worker stopped.'));
      pending.clear();
      unavailable = true;
      worker = null;
    });

    return worker;
  } catch {
    unavailable = true;
    return null;
  }
}

/**
 * Runs `request` in the worker when the input is large enough to justify it,
 * and falls back to `local` otherwise or if the worker is unavailable.
 */
export async function offload<T>(
  input: string,
  request: WorkerCall,
  local: () => Promise<T>,
): Promise<T> {
  if (input.length < WORKER_THRESHOLD) return local();

  const instance = ensureWorker();
  if (!instance) return local();

  const id = nextId++;
  try {
    return await new Promise<T>((resolve, reject) => {
      pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      });
      instance.postMessage({ ...request, id } as WorkerRequest);
    });
  } catch {
    // A failure inside the worker is still a real failure of the operation, but
    // it can also mean the worker itself is broken. Retrying locally answers
    // both cases with the correct result.
    pending.delete(id);
    return local();
  }
}

/** Exposed for tests and for the status bar, which says where the work ran. */
export function workerActive(): boolean {
  return worker !== null && !unavailable;
}
