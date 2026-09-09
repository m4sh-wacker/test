# Deployment

DecodeBox is a static bundle with no backend, no environment variables and no
runtime network access. That makes deployment unusually boring, which is the
point: the same artefact runs on a public URL, on an internal server, and on a
laptop with the network cable pulled out.

## Build

Requires Node.js 20 or later.

```bash
npm ci
npm run build
```

The result is in `dist/`:

```text
dist/
├── index.html          with the Content Security Policy injected at build time
├── 404.html
├── CNAME               only meaningful on GitHub Pages; delete it elsewhere
├── favicon.svg
├── assets/             one JS bundle, one stylesheet
└── fonts/              four woff2 files, self-hosted
```

Around 130 KB gzipped in total. Nothing in it points anywhere outside itself.

## Verifying the no-network claim

The privacy guarantee is the product, so do not take it on trust. Three checks,
in increasing order of how convinced they should leave you:

**Read the policy.** `dist/index.html` carries a CSP with `connect-src 'none'`.
The browser enforces that: the page *cannot* make a network request, whatever
the code tries.

**Grep the bundle.** No CDN, no analytics, no telemetry:

```bash
grep -roE 'https?://[a-z0-9.-]+' dist --include='*.js' --include='*.css' | sort -u
```

The only results are link targets in the interface (github.com, owasp.org,
apache.org) and the SVG namespace URI.

**Watch it.** Open the built site, then the browser's network panel, then use
the tool. After the initial load — HTML, JS, CSS, two fonts — nothing further is
requested. Or disconnect the machine entirely and confirm it still works.

## GitHub Pages

The included workflow does this on every push to `main`. Set
**Settings → Pages → Source** to **GitHub Actions**, not to a branch.

`public/CNAME` holds the custom domain. Change it or delete it for your own
deployment; the build warns if it is missing but does not fail.

## Any static host

Copy `dist/` anywhere that serves files. No rewrite rules, no SPA fallback, no
configuration.

```bash
# nginx
cp -r dist/* /var/www/decodebox/

# Python, for a quick internal share
cd dist && python3 -m http.server 8080
```

If you control the response headers, add the two the CSP cannot carry in a
`<meta>` tag:

```text
Content-Security-Policy: frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
```

See [SECURITY.md](../SECURITY.md) for why those are not in the bundle already.

## Offline and air-gapped

This is the deployment that matters most for incident response, and it needs no
special build.

**From disk.** `dist/` uses relative asset paths, so opening `dist/index.html`
directly works. Two caveats on `file://`: the Web Worker will not start, so very
large inputs run on the main thread and the interface may stutter; and
`crypto.subtle` is unavailable outside a secure context, so hashing and AES
report that rather than failing quietly. Everything else is identical.

**From a local server.** Serving `dist/` over `http://localhost` restores both —
localhost counts as a secure context. This is the recommended way to run it on
an isolated machine:

```bash
cd dist && python3 -m http.server 8080
```

**Transferring it.** The whole thing is a few hundred kilobytes. Copy the
directory onto whatever crosses your air gap. There is nothing to install, no
dependency to resolve at runtime, and no first-run network call.

## Docker

There is no image in this repository, because a static bundle does not need one.
If your environment expects a container:

```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
```

## Reproducing a build

`package-lock.json` pins every dependency to an exact version, and `.npmrc` sets
`save-exact=true` so new ones arrive pinned too. `npm ci` installs exactly what
the lockfile says and nothing else.

The SBOM workflow produces a CycloneDX inventory of what went into a release. A
security tool that cannot tell you what is inside it is asking for trust it has
not earned.

## Upgrading

Rebuild and replace `dist/`. There is no state on the server to migrate.

What people have saved — recipes, favourites, theme, pane sizes — lives in their
own browser's storage and survives. Clearing site data removes it, and nothing
else does.
