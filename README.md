<h1 align="center">OWASP DecodeBox</h1>

<p align="center">
  <strong>Paste a payload. Get every layer unwrapped, every indicator extracted,
  and every security finding explained.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: Apache 2.0"
    src="https://img.shields.io/badge/license-Apache--2.0-5B3CC4"></a>
  <img alt="Status: Incubator" src="https://img.shields.io/badge/OWASP-Incubator-5B3CC4">
  <img alt="Client-side only"
    src="https://img.shields.io/badge/processing-100%25%20client--side-10B981">
</p>

---

## What it is

DecodeBox is a browser-based workbench for transforming, decoding and analysing the kind of data
security practitioners run into every day: Base64 blobs, hex dumps, URL-encoded payloads, JWTs,
compressed streams, obfuscated one-liners, and the tangled combinations of all of them.

Everything runs in your browser. No input, no recipe, and no file ever leaves your machine —
there is no server to send it to.

## Why it works this way

The usual model for a tool like this assumes you already know what your data is: you pick the
operations, you chain them, you iterate. That is fine when you recognise the format on sight, and
useless when you do not — which is most of the time an analyst is looking at something they have
never seen before.

DecodeBox starts from the opposite end. You paste, and it works out what it is holding.

**A transformation tool tells you what the bytes say. DecodeBox tells you what they mean.**

**The report is the product.**
Paste a payload and DecodeBox recursively unwraps everything it can find — not one
path, but every branch, including encoded regions buried *inside* structures.
Then it scans every layer it produced: extracting indicators, and raising security
findings with a CWE reference, the evidence, and the exact decode path that
revealed them.

A real example, from the test suite. Base64 over Base64 over gzip over JSON, with
a PowerShell loader in one field:

```text
Findings   4        Indicators 7        Layers 8        257 ms

CRITICAL  Cloud or service credential            CWE-798
          Input → Base64 → Base64 → gzip
          AKIAIOSFODNN7EXAMPLE

CRITICAL  PowerShell download-and-execute        CWE-94
          Input → Base64 → Base64 → gzip → JSON → Base64 → UTF-16LE
          IEX (New-Object Net.WebClient).DownloadString
```

That second finding is six layers down, and the last hop came from a Base64 blob
inside one JSON field. Nothing that greps the original blob sees it. Nothing that
unwraps a single linear chain reaches it.

**Detection is a first-class surface, and it shows its work.**
Give DecodeBox an input and it returns ranked candidate interpretations, each with a confidence
score and the actual evidence behind it: Shannon entropy, character set, length modulo, pattern
match, magic bytes, structural validity after decoding. You can see *why* it believes something
is Base64 rather than being told to trust it.

**It tells you when there is nothing to decode.**
Paste a digest into most tools and you get silence, or bytes of noise. DecodeBox names the
algorithm — or the handful it could honestly be — explains what gave it away, and says plainly
that hashes are one-way so you stop looking for a decode button. The same applies to PEM keys,
UUIDs, serialized objects and card numbers, which it validates rather than merely pattern-matches.

**It finds obfuscation that has no signature to find.**
A single-byte XOR leaves nothing for a detector to match. When nothing else explains the input,
DecodeBox tries every key and every rotation, scores each result for readability, and names the
key it found — at a confidence that says plainly it was a search rather than a match.

**Layered data is shown as a tree, not a final string.**
Real payloads nest — Base64 wrapping gzip wrapping JSON with another Base64 field inside. Instead
of collapsing that into one answer, DecodeBox renders the whole decode tree, layer by layer, with
per-layer confidence. Click any node to work from there, or generate the recipe for the full path.

**It is usable outside a desktop browser tab.**
Keyboard-first, screen-reader-correct, and genuinely functional on a phone — which matters when
you are triaging something at 2am and not at your desk.

Manual control is never taken away. Automation assists; you stay in the driver's seat.

## Status

Pre-release, and already usable. The workbench runs, and the detection engine correctly unwraps
layered payloads — a Base64-wrapped gzip stream containing JSON resolves to
`Base64 → gzip → JSON` with per-layer confidence and visible evidence.

**504 operations** across data formats, ciphers, public-key cryptography, hashing, compression,
networking, forensics, multimedia, extractors and text handling — every one covered by a
round-trip or a published known-answer test, because an operation that is quietly wrong is worse
than one that is missing. Where an offline reference implementation exists it was checked against
that too: OpenSSL, GnuPG, Pillow, libbz2, liblzma, Python's `cryptography` and `plistlib`.

Files are first-class: drop in a PNG, a ZIP, an executable or a JPEG and DecodeBox reads its
headers, lists and extracts archive entries, pulls EXIF metadata, parses PE and ELF, and renders
images in the output pane — all locally, with nothing uploaded.

Detection covers recursive layer unwrapping with visible evidence, hash and artefact
identification (bcrypt, Argon2, scrypt, the Unix crypt family, LDAP, Django, NTLM, PEM keys,
UUIDs, serialized objects), and automatic single-byte XOR and rotation recovery. The layer chain
says why it *stopped* as well as where: an ending is either the content, a named one-way value —
`Base64 → Base64 → MD5` — a non-decodable remainder such as a JWT signature, or an honest
admission that a bound was hit and there may be more underneath.

**CTF mode** is a third view beside the workspace and the report. It searches every layer for a
flag, measures the index of coincidence to tell a Caesar from a Vigenère, recovers the key for
either, reads the alphabet for binary, Morse, Baconian, Base32 and friends, and ranks the lot with
the measurement that produced each one attached. Every hint carries a recipe that runs from the
original input, so a hint found four layers down is one click away.

The workspace is two columns: an operations rail beside a vertical flow of input, pipeline and
output. Recipes are built by dragging, support breakpoints and single-stepping, can be edited as
JSON, saved locally, and shared as a link that rebuilds them elsewhere. Light and dark themes,
keyboard shortcuts, and a mobile layout throughout.

Recipes are programs, not just lists. **Fork** runs the rest of the chain over every line of a
log; **Subsection** applies it only where a pattern matches; **Register** captures part of the
data into `$R0` for a later argument; **Label**, **Jump** and **Conditional Jump** loop, under a
bound. Work above 64 KB moves to a Web Worker so the interface keeps painting.

The engine ships as a separate chunk fetched after first paint, so the interface is interactive
before five hundred operations have finished downloading.

Not there yet: the accessibility audit and the internationalisation pass are still ahead, and a
handful of formats are deliberately out of scope — a disassembler and an OCR engine are their own
projects, not operations. See [docs/ROADMAP.md](docs/ROADMAP.md).

## Quick start

Requires Node.js 20 or later. CI builds on 20 and 22; `.nvmrc` pins 22 for development.

```bash
npm install
npm run dev
```

Then open the URL printed in the terminal.

To produce the static site:

```bash
npm run build
```

The output lands in `dist/` and is a fully static bundle — no runtime, no server, no environment
variables. Any static host will serve it, including a local `file://` open.

Fonts are bundled rather than fetched from a CDN, so the application makes **no network requests
at all** once loaded. The build fails if a CDN reference ever sneaks in.

```bash
npm run test
```

## Architecture in one paragraph

The UI talks to the analysis engine through a single narrow facade (`src/engine/index.ts`)
exposing six functions: `listOperations`, `bake`, `detect`, `autoDecode`, `identify` and
`analyse`.
Everything the interface knows about transformation lives behind that boundary, which means the
engine and the frontend can be developed, tested and replaced independently — the workspace was
rebuilt from scratch without the engine changing by a line. New operations are self-contained
modules registered with the core — adding one should never require touching the UI. The full
contract is documented in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Security

DecodeBox processes untrusted, deliberately malformed input by design. The application ships
under a Content Security Policy with `script-src 'self'` plus a hash for the one inline script,
no `unsafe-eval`, and `connect-src 'none'` — so the no-network guarantee is enforced rather than
promised. The codebase forbids `eval`, `new Function`, and any path that renders input as HTML.

`style-src` does allow `'unsafe-inline'`, because React writes inline `style` attributes.
[SECURITY.md](SECURITY.md) explains that trade-off, along with the one directive GitHub Pages
cannot enforce.

To report a vulnerability, see [SECURITY.md](SECURITY.md). Please do not open a public issue for
security reports.

## Documentation

| Document | What it covers |
| --- | --- |
| [docs/USAGE.md](docs/USAGE.md) | Worked examples, flow control, files, keyboard |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Building, hosting, offline and air-gapped use |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | The seam, detection, analysis, the executor |
| [docs/WRITING-AN-OPERATION.md](docs/WRITING-AN-OPERATION.md) | Adding a format, end to end |
| [docs/ROADMAP.md](docs/ROADMAP.md) | What is planned, and what is deliberately not |

## Contributing

Contributions are welcome — particularly new transformation operations and improvements to the
detection heuristics. Start with [CONTRIBUTING.md](CONTRIBUTING.md).

All participants are expected to follow the
[OWASP Code of Conduct](https://owasp.org/www-policy/operational/code-of-conduct).

## License

Licensed under the [Apache License 2.0](LICENSE).

## Project

An OWASP Foundation project.

- Project lead: Mohammad Hossein Sadeghian
- Classification: Builder · Code Project
