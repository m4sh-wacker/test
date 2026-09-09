import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Injects the Content Security Policy into the built index.html.
 *
 * Done at build time rather than written into the source HTML for two reasons.
 * The policy hashes the theme script inlined in index.html, and computing that
 * hash from the emitted markup means it can never go stale when the script is
 * edited. And `connect-src 'none'` — which is the point of the policy, since
 * DecodeBox makes no network requests at all — would block the dev server's
 * hot-reload websocket if it applied during development.
 *
 * Notes on the two relaxations:
 *
 * - `style-src` allows 'unsafe-inline' because React writes inline `style`
 *   attributes. Without a separate `style-src-attr`, those fall back to
 *   `style-src`. CSS injection requires HTML injection to already have
 *   succeeded, and `script-src` — where the real risk lives — stays strict.
 * - `frame-ancestors` is absent because browsers ignore it when it arrives in a
 *   <meta> element, and GitHub Pages cannot set response headers. A deployment
 *   behind a proxy should add it there. See SECURITY.md.
 */
function cspPlugin(): Plugin {
  return {
    name: 'decodebox-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const inlineScripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)];
        const hashes = inlineScripts.map(
          (match) => `'sha256-${createHash('sha256').update(match[1] ?? '').digest('base64')}'`,
        );

        const policy = [
          "default-src 'none'",
          `script-src 'self' ${hashes.join(' ')}`.trim(),
          "style-src 'self' 'unsafe-inline'",
          "font-src 'self'",
          "img-src 'self' data: blob:",
          "connect-src 'none'",
          "worker-src 'self' blob:",
          "object-src 'none'",
          "base-uri 'none'",
          "form-action 'none'",
        ].join('; ');

        return html.replace(
          '<head>',
          `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
        );
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), cspPlugin()],

  // Relative asset paths, so the same build works on a custom domain
  // (decodebox.owasp.org), on a project page (user.github.io/DecodeBox), and
  // opened straight from disk in an air-gapped environment.
  base: './',

  build: {
    target: 'es2022',
    sourcemap: false,
    /*
     * The engine loads as its own chunk, split at the dynamic import in
     * src/engine/index.ts, so the interface paints before five hundred
     * operations have finished downloading.
     *
     * That chunk is deliberately not split further. Every operation is reachable
     * from the search box, so a per-category split would trade one download for
     * a stall the first time somebody scrolls the list — and this tool is meant
     * to work from a file:// URL on an air-gapped machine, where a waterfall of
     * small requests is worse than one large one. The limit is raised to cover
     * it, and only it: if the *shell* ever crosses this line, that is a
     * regression and the warning should fire.
     */
    chunkSizeWarningLimit: 700,
  },

  server: {
    port: 5173,
    open: true,
  },

  preview: {
    port: 4173,
  },

  test: {
    /*
     * The default is five seconds, which is not enough for the first call in a
     * test file.
     *
     * The engine is a separate chunk, reached through a dynamic import, so the
     * first `await` on a facade function in any file loads six hundred
     * kilobytes of operations before it can answer. That cost is real but it is
     * paid once per file, and it is not what any of these tests are measuring —
     * timing out on it would be the build punishing us for the code splitting
     * rather than for anything being slow.
     */
    testTimeout: 30000,
  },
});
