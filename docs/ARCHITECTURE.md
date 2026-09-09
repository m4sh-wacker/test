# Architecture

This document describes how OWASP DecodeBox is put together and, more importantly, why. If you
are adding an operation or touching the detection engine, read this first.

## Principles

**No backend, ever.** Every transformation happens in the user's browser. This is not a
deployment convenience — it is the product. Security practitioners paste credentials, tokens,
customer data and live malware into tools like this one. If there is no server, there is nothing
to breach, nothing to log, and nothing to subpoena. Any proposal that requires sending data
somewhere is out of scope by definition.

**Detection must explain itself.** A confidence score with no evidence behind it is a number the
user has to take on faith. Every detection this engine produces carries the measurements that
produced it. This constrains the implementation: heuristics that cannot articulate their reasoning
do not go in, however accurate they might be.

**Narrow seams.** The interface and the engine meet at exactly one module. Both sides can be
rewritten independently, and either can be tested without the other.

**Hostile input is the normal case.** Every operation assumes its input was crafted to break it.
Failing loudly is correct; crashing the app, hanging the tab, or executing anything is not.

## Layout

```text
src/
├── engine/          the analysis engine and its public facade
│   ├── index.ts     THE SEAM — the only module the UI imports from
│   ├── types.ts     the shared contract
│   ├── heavy.ts     the lazy half — everything that needs the operation registry
│   ├── core/        recipe executor, byte handling, ciphers, codecs
│   ├── operations/  one self-contained module per transformation
│   ├── detection/   entropy, charset, pattern, magic-byte and structural analysis
│   ├── analysis/    recursive exploration, indicators, security findings
│   ├── ctf/         flag search, cipher key recovery, ranked hints
│   └── worker/      the engine off the main thread
├── store/           one zustand store — input, recipe, detection, layout, theme
├── components/
│   ├── layout/      the workspace shell, splitters, status bar, mobile tabs
│   ├── panes/       operations, pipeline, input, output, and the detection band
│   ├── report/      the analysis report
│   ├── ctf/         CTF mode
│   ├── result/      the layer chain and the evidence panel
│   └── ui/          shared primitives
├── hooks/           interaction logic shared across components
├── i18n/            all user-facing strings
└── styles/          design tokens and theme definitions
```

The dependency rule is one-directional: `components` may import from `store`, `hooks`, `i18n` and
`engine/index.ts`. Nothing in `components` may import from `engine/core`, `engine/operations`,
`engine/detection` or `engine/ctf`. Nothing in `engine` may import from `components` or `store`.

## The seam

`src/engine/index.ts` exposes seven functions and nothing else:

```ts
listOperations(): Promise<OperationDef[]>
bake(input: string, recipe: Recipe): Promise<BakeResult>
detect(input: string): Promise<Candidate[]>
autoDecode(input: string, opts?: Partial<AutoDecodeOptions>): Promise<Layer>
identify(input: string): Promise<HashIdentification | null>
analyse(input: string, opts?: Partial<AnalyseOptions>): Promise<Analysis>
hints(input: string, opts?: Partial<CtfOptions>): Promise<CtfReport>
```

Every one of them is asynchronous, even where the underlying work is not. Two things move
underneath this line without the interface being told: work above a size threshold runs in a Web
Worker, and the engine itself is downloaded on demand.

The full type definitions live in `src/engine/types.ts`. Treat them as a published contract:
changing them is a coordinated change across both halves of the project, not a local refactor.

### The engine is a separate chunk

Five hundred operations and the algorithms behind them are the bulk of the build, and none of
them are needed to draw a window. So the facade reaches them through a dynamic
`import('./heavy')` rather than a static import, and the bundler splits there:

```text
index.js   ~318 kB   the shell: React, the interface, and the few pure helpers below
heavy.js   ~600 kB   the engine, fetched immediately after first paint
```

`App` calls `listOperations()` on mount, so the engine starts downloading the moment the shell
exists rather than the first time somebody pastes something. The module system caches it, so only
the first call waits.

The facade also re-exports a handful of things **synchronously**, and each one is deliberate:
`formatBytes`, `renderText`, `truncate`, `imageMimeOf`, the layer-chain readers, `CATEGORY_ORDER`,
`INPUT_ENCODINGS`, `encodeInput`, `toMarkdown`, `flatten`, `defang`. They are small, pure, used on
every render, and — the actual rule — **none of them can reach an operation**. Adding a sync export
that transitively imports `engine/operations` silently undoes the split, and the sign of it is the
shell chunk crossing the 700 kB warning line in `vite.config.ts`.

### Breaking the registry cycle

`operations/index.ts` is built by importing every operation module, so anything it imports cannot
import it back. Two things need to: `Magic` and `Generate all hashes` run other operations, and
detection needs the list of operations that declare detection criteria.

`operations/registryAccess.ts` is the answer. It is a leaf module — it imports a type and nothing
else — and the registry hands its own contents to it at the end of its own evaluation. Callers ask
at run time, by which point they always exist. `detectableOperations()` throws rather than
returning an empty list if it is asked too early, because detection that silently finds nothing
looks exactly like an input that matches nothing.

## Operations

An operation is a self-contained module that declares what it is and how to run it. It never
renders anything. The interface builds its controls from the declared argument types, which is
why argument declarations matter as much as the transformation code:

```ts
{
  id: 'from-base64',
  name: 'From Base64',
  category: 'Data format',
  description: 'Decodes Base64-encoded data back to its raw form.',
  aliases: ['b64', 'base64 decode', 'atob'],
  args: [
    { name: 'Alphabet', type: 'option', value: 'A-Za-z0-9+/=', options: [...] },
  ],
  run(input, args) { /* ... */ },
  detection: {
    entropy: [3.4, 5.2],
    pattern: /^[A-Za-z0-9+/]{8,}={0,2}$/,
  },
}
```

Adding an operation means adding one file and registering it. It should never require touching the
UI, the store, or any other operation. If it does, the seam has leaked and that is the bug to fix
first.

## Detection

The engine scores candidate interpretations by combining independent signals, each of which
produces both a weight and a human-readable justification:

| Signal | What it measures |
| --- | --- |
| Shannon entropy | Compressed and encrypted data sit high; text and Base64 sit in known bands |
| Character set | Which bytes actually occur, and whether they fit a known alphabet |
| Length rules | Modulo constraints, fixed lengths, padding |
| Pattern match | Structural regular expressions for the format |
| Magic bytes | File and stream signatures such as `1F 8B` for gzip |
| Byte frequency | Language and encoding inference from distribution |
| Structural validity | Whether the decoded result is itself well-formed — valid UTF-8, parseable JSON, a decodable stream |

That last signal carries the most weight and is the one that separates a real detection from a
plausible-looking coincidence: any sufficiently long hex string is *shaped* like Base64, but only
one of the two interpretations produces something coherent when you actually decode it.

### Lookahead

Structural validity alone is not enough, because a correct decode often produces something that
looks like failure. Base64 wrapping a gzip stream decodes to binary noise — indistinguishable
from a wrong guess, until you notice the noise begins with `1F 8B`.

So after decoding, the engine checks whether the *output* is itself a recognisable format. A
known signature inside the result is usually the strongest evidence available that the current
layer was decoded correctly, and it is what makes multi-layer detection work at all. The same
check catches UTF-16LE text, which is what `powershell -EncodedCommand` hides behind Base64 and
what a naive printable-character test would reject as binary.

The primary signals are scored as a maximum rather than a sum. They are alternative proofs of the
same claim, and two confirmations do not make a correct decode more correct.

### Bytes between steps

Data travels between operations as a byte string — one character per byte, **always**, not only
when it fails to be valid UTF-8. Text becomes bytes exactly once, at the input edge, in the
character set the input pane is set to; bytes become text exactly once, at the display edge, in
`renderText`. Everything in between is bytes.

That rule is not decoration. Both halves of it were broken, and each break was invisible because
it was symmetric:

- Every operation used to read its input with `toBytes`, which re-encodes as UTF-8. `From Hex`
  of `1f8b` followed by `To Hex` returned `1f c2 8b`: the gzip magic number, destroyed. The MD5
  of any loaded binary file was wrong. The Base64 we produced could not be decoded by any other
  tool. Round trips inside DecodeBox passed the whole time, because the inverse made the same
  mistake backwards.
- Operations used to return `bytesToText`, which decodes valid UTF-8 into text. That reading is
  not reversible: the bytes `C3 A9` came back as `é`, which the next step read as the single
  byte `E9`. Two different byte strings became the same byte string.

So: read with `asBytes`, return with `bytesToLatin1`, and never call `bytesToText` from an
operation. `renderText` exists for the interface, and `previewText` for evidence lines.

`autoDecode` applies this recursively to build the layer tree, decoding each layer and re-running
detection on the result until it stops finding anything above the confidence threshold or hits the
depth limit. The recursion is bounded on depth, node count, and total time — an adversarial input
must not be able to make this run forever.

### Where the chain stops, and why

Every chain records a `Terminus` on its last layer, because the stopping condition is as much of
the answer as the layers are. `Base64 → Base64` that ended on a SHA-256 and `Base64 → Base64` that
ended because the clock ran out look identical if all you show is the layers, and they mean
opposite things — one is finished, the other is a partial result somebody should keep pulling at.

| Reason | Meaning | `complete` |
| --- | --- | --- |
| `plain` | Nothing below decodes; this is the content | yes |
| `identified` | The value has a name instead — a digest, a UUID, a key | yes |
| `remainder` | Finished, but what is left is not decodable by nature: a JWT's signature | yes |
| `depth` / `budget` / `cycle` / `failed` | A bound was hit; there may be more underneath | no |

The ordering matters and is easy to get backwards. Identification is asked **after** decoding has
run out of candidates, never before. Thirty-two hex digits are digest-shaped *and*, often,
hex-encoded text — and when both are true the decode is the better answer. Leading with "this is
an MD5" would throw it away.

`remainder` is declared by the operation, in `detection.terminalNote`. A JWT's payload is plain
JSON by every measure the detector has, so without it the chain would end on "this is the content
itself" and quietly drop the fact that a signature is sitting there unverified.

`describeChain` renders an identified ending as part of the chain — `Base64 → Base64 → MD5` — and
an incomplete one with a trailing ellipsis, so a partial result can never read as a complete one.

**Deep scan** additionally brute-forces cheap transformations (single-byte XOR, bit rotation,
character-encoding permutations) at each node. It is off by default because it is expensive.

### Brute force, as a last resort

Some obfuscation leaves nothing to recognise. A single-byte XOR — the most common cheap
obfuscation in malware and in CTF traffic — produces output with no signature, no alphabet and
no structure, so every criteria-based detector is blind to it.

When nothing declared reaches a usable confidence, the engine tries all 255 XOR keys and all 25
rotations and scores each result for readability: printable ratio, letter and space frequency
against English, and the presence of sequences that essentially never occur by chance. That is
the same thing an analyst does by hand, only faster.

It runs last and its confidence is capped below what a structural match can earn, because brute
force can always produce *something*, and something is not the same as evidence.

### Identification is not decoding

`identify` answers a different question from the rest of the engine: not *what is this
wrapped in*, but *what is this*. It exists because of a specific failure — paste an MD5 into a
decoding tool and you get silence, or sixteen bytes of hex-decoded noise. Neither tells the
analyst the thing they need, which is that the input is one-way and there is no decode to find.

It is deliberately a separate facade function rather than an operation. Modelling a digest as a
layer would put something in the decode chain that cannot be decoded, and the chain would stop
meaning what it says.

It covers digests and password formats, and also the artefacts that are not encodings at all:
PEM keys and certificates, SSH keys, UUIDs, MAC addresses, data URIs, PHP and Java serialized
objects, timestamps, and card numbers. Where a format can be validated rather than merely
matched — the Luhn check, a UUID version nibble, a timestamp landing on a plausible date — it is
validated, because shape alone produces confident nonsense.

Matches are always ranked and never singular. A bare 32-character hex string is genuinely
ambiguous between MD5, NTLM, MD4 and others; a tool that picks one and states it confidently is
lying about what it knows. Self-identifying prefixes are the exception, and are scored as such.

### On being wrong

A confident wrong answer is worse than no answer. Candidates below the threshold are rendered as
low-confidence rather than hidden, evidence is always visible, and nothing is applied to the user's
recipe without an explicit click. When adding a heuristic, ask what it does to false positives
before asking what it does to coverage.

## CTF mode

`hints` answers a third question, and the difference from detection is the standard of proof.
Detection has to be right, because it drives an automatic decode and a wrong answer spends the
analyst's trust. A hint only has to be *worth trying*: the person reads the reason, decides in a
second, and clicks or does not. So CTF mode will happily report a Vigenère key it is 60% sure of,
which detection never would — and it reports the measurement that got there, so the 60% is legible
rather than asserted.

Every source runs over **every layer** of the decode chain, not just the input. A flag three
layers down is the normal case.

- **Flags.** The search is for the shape — a short prefix, a brace, bounded content — with a list
  of well-known prefixes used only to *rank* what it finds. A tool that only knew `flag{...}`
  would miss the flag on most sites it was pointed at. A format the user declares promotes an
  exact match and adds a non-brace search; it never narrows.
- **Index of coincidence.** English sits near 0.067 because its letters are unevenly distributed;
  a uniformly random string sits at 1/26 ≈ 0.0385. A monoalphabetic substitution permutes the
  alphabet without flattening it, so it keeps 0.067. A polyalphabetic cipher pushes towards
  0.0385. That gap is the whole diagnostic, and it is what tells Caesar from Vigenère before
  either is tried.
- **Key recovery.** Caesar by chi-squared fit against English frequencies. Vigenère by the same
  statistic over candidate key lengths — the right length is the one whose columns each score near
  English — then one chi-squared fit per column. `bestShift` returns the rotation that *decodes*;
  the key letter is its inverse, and conflating the two is the classic way to produce a
  plausible-looking wrong key.
- **Alphabets.** Binary, Morse, Baconian, Base32, Base58, Base85, decimal, octal, A1Z26. None of
  these has a magic number, so the general detector scores them low; here the alphabet alone is
  enough to earn a place in a list of suggestions.
- **Pictures, and identification.** LSB extraction, bit planes, strings and EXIF for an image
  layer; and for a digest, the honest hint is "crack it, do not decode it", with no recipe
  attached at all.

Each hint carries a recipe that runs **from the original input**, not from the layer it was found
at, so clicking a hint discovered four layers down produces a recipe that works. The test suite
executes every recipe every hint hands out, for exactly this reason.

It is computed on demand rather than alongside detection, and only refreshes while its view is
open: it recovers cipher keys by search, which is far too much to spend on a keystroke nobody is
watching the result of.

## Files and binary data

A payload that turns out to be a file is the normal case in incident response, so the byte
string that travels between operations has to survive being one. Two rules follow from that,
and both have already been broken once:

- The file loader reads an `ArrayBuffer`, never `File.text()`. Reading as text decodes UTF-8 and
  replaces every invalid sequence with U+FFFD, so a PNG or an executable arrives destroyed and
  nothing downstream can recover it.
- Any operation returning bytes uses `bytesToLatin1`, never `bytesToText` and never a plain
  `TextDecoder`. The output pane renders once, with `renderText`; the download writes the bytes
  themselves, because a PNG that has been through a UTF-8 encoder is not a PNG.

Container and header parsing — ZIP, PE, ELF, PNG, JPEG, EXIF — is done against the real formats
rather than by extension, and without a dependency: the platform's `DecompressionStream` covers
the one hard part, which is the deflate inside a ZIP entry.

Images are returned as a `data:` URI and rendered by the output pane, which the CSP permits for
images alone. SVG is deliberately excluded: it is markup that can carry script, and rendering an
untrusted one would hand the page to whoever produced it.

## Analysis

`analyse` is the reason this project is at OWASP rather than in a utilities
folder. Everything else here helps someone transform data; this tells them what
they are holding and which part of it should worry them.

It runs in two stages, and the order is the whole design.

### Stage one: explore

Ordinary unwrapping follows one path — decode, decode again, stop. That misses
the case that matters most, where the interesting part is *embedded* in an
otherwise unremarkable structure: a JSON body with one Base64 field, a log line
with a hex blob in the middle, a token whose claims contain another token.

So the explorer follows two kinds of edge from every node:

1. Decoding the node whole, the way detection already does.
2. Decoding each encoded-looking region found *inside* it.

The result is a tree rather than a chain. A node reached by the second kind of
edge records its `origin`, so the report can say where it came from.

Bounds are not optional here. Depth, node count and wall-clock time are all
capped, and a node whose output has been seen before is not followed — two
operations that decode into each other would otherwise loop forever on a crafted
input.

### Stage two: scan

Indicators and findings are gathered *after* the tree exists, from every node in
it. That ordering is the point: an address or a payload that only becomes visible
four layers down is reported with the path that reveals it. Scanning the original
blob alone would find none of them.

Indicators are emitted defanged as well as raw. A report that turns into live
links the moment it lands in a ticket is a hazard, not a deliverable.

### Writing a finding rule

Two rules govern every entry in `findings.ts`.

**It must be actionable.** "Contains the word password" is noise. "This JWT
declares alg:none, so its signature is not checked" changes what the person does
next.

**It must be specific enough to be trusted.** A rule that fires on ordinary
content trains people to ignore the panel, and a security tool nobody reads is
worse than no tool. Where a pattern is inherently ambiguous, rate it low or
informational rather than dropping it — but never dress it up as more than it is.

## Performance

- Detection is debounced while the user types, and a slow analysis can never overwrite a newer
  one — results are gated on a rising token.
- Every step runs under a timeout, so a pathological input cannot hang the tab.
- Work above a size threshold runs in a Web Worker; below it the message round trip would cost
  more than the work, so it stays on the main thread. If the worker cannot start, every call falls
  back to running in place.
- The engine is a separate chunk, fetched after first paint, so the shell is interactive
  immediately.
- Large inputs render a capped window rather than the whole buffer.
- Detection is bounded on depth, node count and wall-clock time.

## Security properties of the build

- Strict CSP: no `unsafe-inline`, no `unsafe-eval`.
- No `eval`, no `new Function`, no `dangerouslySetInnerHTML`, no `innerHTML` assignment anywhere.
- Fully static output. No environment variables, no runtime configuration, no network calls.
- Recipe JSON and the URL hash are parsed defensively — they are untrusted input like anything
  else, and are a prototype-pollution surface if treated carelessly.
- Runtime dependencies are kept deliberately few. In a security tool, every dependency is someone
  else's supply chain inside your threat model.
