# Writing an operation

An operation is one object in one file. It should never require touching the
interface, the store, or another operation — if it does, something has leaked
and that is the bug to fix first.

This guide is the fastest path from an idea to a merged one.

## The shortest possible operation

Add it to the module that fits in `src/engine/operations/`, or make a new one:

```ts
{
  id: 'reverse-words',
  name: 'Reverse words',
  category: 'Utils',
  description: 'Reverses the order of words while leaving each word intact.',
  aliases: ['flip words', 'word order'],
  args: [],
  run: (input) => input.split(/\s+/).reverse().join(' '),
}
```

If you created a new module, export the array and register it in
`src/engine/operations/index.ts`. That is the entire wiring.

## The fields

**`id`** — a stable kebab-case slug. It appears in share links and saved
recipes, so changing one silently breaks every link anybody has sent. Treat it
as permanent.

**`name`** — what people see. Where the field already has a settled name for a
transformation, use it: "From Base64", not "Base64 Reader". Shared vocabulary is
what lets someone move between tools without relearning them.

**`description`** — one sentence, ending in a full stop. It is shown on hover
and in the inspector, and there is a test that fails if it is thin or unpunctuated.
Say what the operation does, not what category it is in.

**`aliases`** — what someone would actually type. `b64`, `atob`, `base64 decode`.
Search matches these and shows which alias matched, so a good alias list is the
difference between an operation being found and being invisible.

**`category`** — one of the values in `CATEGORY_ORDER`. Adding a new category
means adding it there too, or a test fails.

## Arguments

Never render your own controls. Declare the argument and the interface builds
the right one:

| `type` | Control | Use for |
| --- | --- | --- |
| `string` | text field | free text |
| `textarea` | multi-line field | anything long |
| `number` | numeric field, honours `min`/`max` | counts, lengths, amounts |
| `boolean` | switch | a flag |
| `option` | dropdown | a fixed set of choices |
| `toggleString` | dropdown attached to a text field | a key or IV with a format |

```ts
args: [
  { name: 'Delimiter', type: 'option', value: 'Space', options: ['None', 'Space', 'Comma'] },
  { name: 'Strict', type: 'boolean', value: false },
  {
    name: 'Key',
    type: 'toggleString',
    value: '',
    toggleValues: ['UTF-8', 'Hex', 'Base64'],
    toggleValue: 'Hex',
    hint: 'Repeated across the input',
  },
]
```

Read them with the `arg` helper, which returns the widened primitive:

```ts
run: (input, args) => {
  const strict = arg(args, 'Strict', false);
  const delimiter = String(arg(args, 'Delimiter', 'Space'));
  // …
}
```

`value` is the default, and for `option` it must be one of `options`. There is a
test for that, because a dropdown whose default is not in its own list renders
blank.

## Failing well

Assume every input was crafted to break you. Throw `OperationError` with a
message that says what is wrong:

```ts
if (cleaned.length % 2 !== 0) {
  throw new OperationError('Hex input has an odd number of digits.');
}
```

A thrown `OperationError` is a *correct outcome*: the executor catches it,
marks the step, and shows your message. What must never happen is returning
plausible-looking garbage, hanging, or throwing something without an explanation.

There is a test that runs every operation against empty input, null bytes, three
thousand characters, a script tag and an emoji. It does not require success — it
requires not crashing.

## Bytes, not text

This is the rule most easily got wrong, and it has been got wrong twice.

Data travelling between steps is a **byte string**: one character per byte,
always. Read it with `asBytes`, return it with `bytesToLatin1`:

```ts
import { asBytes, bytesToLatin1 } from '../core/bytes';

run: (input) => bytesToLatin1(decodeSomething(asBytes(input)))
```

Three things are wrong and each one has shipped:

- `new TextDecoder().decode(...)` replaces every invalid UTF-8 sequence with
  U+FFFD, so a gzip stream is destroyed before the next step sees it.
- `bytesToText(...)` decodes valid UTF-8 into text, and that is not reversible:
  `C3 A9` goes out as `é` and comes back through `asBytes` as `E9`. It is for
  the screen, not for the pipeline.
- `toBytes(input)` re-encodes as UTF-8, so byte `80` becomes `C2 80`. Use it
  only for an argument the user typed — a passphrase or a salt — never for the
  data itself.

Text becomes bytes once, at the input pane, in the character set chosen there.
Bytes become text once, at the output pane, in `renderText`. An operation is
always in between.

## Making it detectable

Add `detection` and your operation joins automatic detection. Be conservative:
a criterion that matches too eagerly degrades detection for *every* format, not
just yours.

```ts
detection: {
  formatName: 'Base45',            // display name, when the op name reads badly
  pattern: /^[0-9A-Z $%*+\-./:]+$/, // structural shape
  entropy: [2.0, 5.5],              // plausible randomness band
  lengthMultiple: 3,                // hard length rule
  minLength: 12,                    // do not bother below this
  magic: '1f8b',                    // leading bytes, as hex
  test: (text, bytes) => …,         // for structure a regex cannot express
}
```

Criteria only decide whether the operation is *tried*. What actually earns
confidence is the output: valid JSON, readable text, a recognisable signature in
the result. That is why a conservative pattern costs you nothing — a correct
decode will still win on its output.

Run the detection tests after adding one. If another format's test starts
failing, your criteria are too broad.

## Tests

Every operation needs one. Put it in `src/engine/catalogue.test.ts`.

**A round trip**, if you added a pair:

```ts
expect(await run(text, 'to-base45', 'from-base45')).toBe(text);
```

**A published known answer**, if one exists. This is what catches the bug a
round trip cannot: an implementation that is self-consistent and wrong. The MD5
in this repository was exactly that until a known-answer test caught a
transposed constant in the shift table.

```ts
expect(await run('abc', 'md5')).toBe('900150983cd24fb0d6963f7d28e17f72');
```

**A malformed input**, showing the error is descriptive:

```ts
expect((await bake('not hex', recipe('from-hex'))).error?.message).toContain('hex');
```

## Before opening the pull request

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

All four must pass; CI runs the same commands.

Do not add a runtime dependency without discussing it first. Everything here is
built on the platform: `DecompressionStream` for gzip and ZIP, `crypto.subtle`
for AES and hashing, `TextDecoder` for character sets. In a security tool every
dependency is somebody else's supply chain inside your threat model, and forty
lines of code is usually the cheaper trade.

## Where things live

```text
src/engine/operations/
├── index.ts        the registry and category order
├── types.ts        the internal Operation shape and the arg helper
├── dataFormat.ts   Base64, Hex, URL, entities, UTF-16…
├── encodings.ts    Base85, Base45, Morse, Punycode, quoted-printable…
├── ciphers.ts      classical ciphers, RC4, bit operations
├── symmetric.ts    AES through Web Crypto
├── hashing.ts      MD5, HMAC, PBKDF2, checksums
├── compression.ts  gzip, zlib, deflate
├── text.ts         find/replace, regex, line handling
├── network.ts      URIs, CIDR, IPv6, user agents
├── structured.ts   CSV, JSON, XML
├── datetime.ts     timestamps, FILETIME
├── forensics.ts    file types, entropy, frequency analysis
├── files.ts        images, EXIF, ZIP, PE, ELF
├── extractors.ts   IOCs
├── utils.ts        general text operations
└── flow.ts         Fork, Merge, Subsection, Register, jumps
```

For how the engine fits together, read
[ARCHITECTURE.md](ARCHITECTURE.md) — particularly the seam and the detection
sections.
