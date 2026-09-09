/// <reference lib="webworker" />

import { bake } from '../core/bake';
import { detect } from '../detection/detect';
import { autoDecode } from '../detection/autoDecode';
import { analyse } from '../analysis';
import { ctfHints } from '../ctf';
import type { Recipe } from '../types';
import type { AnalyseOptions } from '../analysis';
import type { AutoDecodeOptions } from '../detection/autoDecode';
import type { CtfOptions } from '../ctf';

/**
 * The engine, off the main thread.
 *
 * Analysis explores a tree and brute-forces 255 XOR keys; baking can run a
 * recipe over thousands of forked branches. On a multi-megabyte input either
 * will hold the main thread long enough for the browser to stop painting, and a
 * frozen tab reads as a broken tool no matter how correct the answer is.
 *
 * The engine had no DOM dependencies to begin with, which is what makes this a
 * transport change rather than a rewrite.
 */

export type WorkerRequest =
  | { id: number; kind: 'bake'; input: string; recipe: Recipe }
  | { id: number; kind: 'detect'; input: string }
  | { id: number; kind: 'autoDecode'; input: string; options?: Partial<AutoDecodeOptions> }
  | { id: number; kind: 'analyse'; input: string; options?: Partial<AnalyseOptions> }
  | { id: number; kind: 'hints'; input: string; options?: Partial<CtfOptions> };

export type WorkerResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string };

async function handle(request: WorkerRequest): Promise<unknown> {
  switch (request.kind) {
    case 'bake':
      return bake(request.input, request.recipe);
    case 'detect':
      return detect(request.input);
    case 'autoDecode':
      return autoDecode(request.input, request.options);
    case 'analyse':
      return analyse(request.input, request.options);
    case 'hints':
      return ctfHints(request.input, request.options);
  }
}

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  void handle(request)
    .then((result) => {
      const response: WorkerResponse = { id: request.id, ok: true, result };
      self.postMessage(response);
    })
    .catch((error: unknown) => {
      // A worker that dies silently is worse than one that reports a failure,
      // so every rejection comes back as a message rather than an unhandled one.
      const response: WorkerResponse = {
        id: request.id,
        ok: false,
        error: error instanceof Error ? error.message : 'The engine failed.',
      };
      self.postMessage(response);
    });
});
