# Using DecodeBox

Worked examples, in the order a practitioner meets them. Every one can be
followed in the live tool by pasting the input shown.

## The three modes

**Workspace** transforms data. An operations rail, a pipeline you build, an
input and an output.

**Report** tells you what the data *is*. It runs on its own the moment you paste
something, and it is usually the faster answer.

**CTF mode** tells you what to *try* next, ranked, with the reason for each. It
runs when you open it, not before.

Switch between them in the header. The badge on Report is the number of security
findings; if it is red, read it before doing anything else. The badge on CTF is
the number of flags found.

---

## Just tell me what this is

Paste it. That is the whole workflow.

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc
```

The band above the output says `Detected JWT — 82%`. **Why?** opens the evidence:
the three-segment shape, the `eyJ` prefix that is Base64 for `{"`, and the fact
that both segments decode to valid JSON.

Nothing was configured. That is the point.

## Nested encodings

```text
H4sIAAAAAAAACgXBSwqAMAwFwLu8dS1RC0JuE0tE8UNpk27EuzvzQrs+Boa47XGT4/KqCPCmFYzW87BKPr0goNUMxkhxojhTTIQAMdO7WAOn5fsBw+nWcE4AAAA=
```

Detected as `Base64 → gzip → JSON`. Each layer in the chain is clickable, so you
can look at the gzip bytes as easily as the final JSON.

**Apply as recipe** turns what was detected into three editable steps. Automatic
detection becomes the starting point for manual work rather than a replacement
for it.

### Where the chain stops

The last node in the chain is not always a layer. Paste this — an MD5, wrapped
twice in Base64:

```text
TURrNFpqWmlZMlEwTmpJeFpETTNNMk5oWkdVMFpUZ3pNall5TjJJMFpqWT0=
```

and the chain reads `Base64 → Base64 → MD5`, with the last node greyed and
locked: *This is MD5, which is one-way. There is nothing left to decode.*
Identification follows the chain down, so a digest three layers in is named
rather than left as a puzzle.

The reverse case is just as important. If the chain hit a limit rather than an
answer, the last node is an amber `more below`, the description ends in `…`, and
the strip says which limit it was. A partial result never reads as a complete
one.

## A hash, or something that only looks like one

```text
5d41402abc4b2a76b9719d911017c592
```

DecodeBox does not try to decode it. It says:

```text
Looks like MD5 — 62%          32 hex digits (128 bits)
Could also be: NTLM · MD4 · LM · RIPEMD-128
Hashes are one-way. There is nothing here to decode.
```

Ranked, never singular. Thirty-two hex characters are genuinely ambiguous, and a
tool that picks one confidently is lying to you.

Paste `aad3b435b51404eeaad3b435b51404ee` and it says something more specific: that
is the LM hash of an empty password.

## Obfuscation with no signature

```text
kWZ¥[RVQ¥O^LLHPM[¥VL¥VQ¥KWZ¥YVSZ¥¥Q[¥KWZ¥JLZM¥¥PJQK¥VL¥POZQ
```

Nothing here matches any format. So DecodeBox tries all 255 single-byte XOR keys
and all 25 rotations, scores each result for readability, and reports the one
that worked:

```text
Detected XOR (key 0x3F) — 82%
The admin password is in the file, and the user account is open.
```

The confidence is capped below what a structural match earns, because this was a
search rather than a recognition. **Apply as recipe** gives you the XOR step with
the key already filled in.

## The report on a real payload

Paste a layered sample and open **Report**:

```text
Findings 4        Indicators 7        Layers 8        257 ms

CRITICAL  Cloud or service credential                    CWE-798
          Input → Base64 → Base64 → gzip
          AKIAIOSFODNN7EXAMPLE

CRITICAL  PowerShell download-and-execute                CWE-94
          Input → Base64 → Base64 → gzip → JSON → Base64 → UTF-16LE
          IEX (New-Object Net.WebClient).DownloadString
```

That second finding is six layers down, and the last hop came from a Base64 blob
inside one JSON *field* — not from unwrapping the JSON itself. Grep would not
find it. A linear unwrapper would stop before it.

**Copy report** puts the whole thing on the clipboard as Markdown, with every
indicator defanged, ready for a ticket.

---

## CTF mode

Open it from the header. It searches every layer of the decode chain, not just
what you pasted, and it answers a different question from the rest of the tool:
not *what is this* but *what should I try*.

```text
Gur pregvsvpngr jnf vffhrq ynfg fcevat naq abobql abgvprq gung vg unq
nyernql rkcverq ol gur gvzr gur freivpr jnf qrcyblrq.
```

```text
CRACKED  Undo ROT13                                              85%
         Index of coincidence 0.0643, close to English (0.0667) rather than
         random (0.0385), so one alphabet was used throughout. Of the 25
         shifts, 13 fits English letter frequencies best.
         in the input   The certificate was issued last spring and nobody…
```

That paragraph is the whole design. A ranked list with no reasons is a slot
machine; the measurement is what lets you tell a real finding from a guess
before spending a click on it.

The same statistic separates a Caesar from a Vigenère. Where the index of
coincidence comes out near random, DecodeBox splits the text into columns at
every key length from 2 to 16, finds the length whose columns each look like
English, and solves each column as a single shift — recovering the key and
showing you the plaintext it produces.

**Flag format** is optional. The search finds `anything{...}` on its own; typing
`picoCTF` there promotes an exact match to certain and adds a search for flags
that are not brace-shaped.

**Apply** loads the hint as a recipe and switches to the workspace. Every hint's
recipe runs from the original input, so a hint found four layers down still
works with one click.

Hints with nothing to click are statements, not moves — a digest gets *crack it,
do not decode it*, because that is the honest advice.

---

## Building recipes

### The pipeline

Click or drag an operation from the rail. It joins the pipeline between INPUT and
OUTPUT. Click a node to edit its arguments in the inspector below.

Drag nodes to reorder them, or use the arrows in the inspector — dragging is
never the only way to do anything.

### Pausing and stepping

Click the dot on any node to set a breakpoint. The recipe runs up to it and
stops, and the output shows the data *at that point*. **Step** runs one more
operation.

This is how you find which step in a chain of eight is the one that broke.

### Flow control

Real data is rarely one blob. Four operations turn a chain into a program.

**Fork** splits the input and runs everything after it on each piece:

```text
Input:  aGVsbG8=
        d29ybGQ=

Recipe: Fork (split \n, join \n) → From Base64

Output: hello
        world
```

Add **Merge** to end the fork and continue on the joined result.

**Subsection** applies the following operations only to the parts matching a
pattern, leaving everything else untouched:

```text
Input:  user=aGVsbG8= action=login user=d29ybGQ=

Recipe: Subsection ((?<=user=)[A-Za-z0-9+/=]+) → From Base64

Output: user=hello action=login user=world
```

**Register** captures part of the data into `$R0`, `$R1`… for later arguments:

```text
Recipe: Register (key=([0-9a-f]{2})) → XOR (Key: $R0)
```

**Label**, **Jump** and **Conditional Jump** loop. Peel Base64 until it stops
looking like Base64:

```text
Label (top) → From Base64 → Conditional Jump (^[A-Za-z0-9+/=]+$ → top)
```

Every loop is bounded. A jump has a maximum count, and the whole recipe has a
time ceiling — a recipe is untrusted input like any other.

### Saving and sharing

**Save** keeps a recipe in this browser. **Share** produces a link that rebuilds
it in someone else's.

The input is **not** in the link by default. A recipe is worth passing to a
colleague; a payload usually is not, and a URL is the least private place it
could end up. Including it is one checkbox, with a warning attached.

---

## Files

Drop a file onto the input, or use the load button. Files are read as raw bytes,
so a PNG or an executable arrives intact.

| Goal | Operations |
| --- | --- |
| What kind of file is this? | Detect file type |
| Is something hidden after the end? | Scan for embedded files |
| Show me the picture | Parse image, Render image |
| Where was this photo taken? | Extract EXIF |
| What is in this archive? | List ZIP contents, Extract from ZIP |
| Is this executable packed? | Parse PE header |
| Hashes for the report | File hashes |

## Keyboard

| Key | Action |
| --- | --- |
| `Ctrl/Cmd + Enter` | Bake the recipe |
| `Ctrl/Cmd + K` | Focus the operation search |
| `Ctrl/Cmd + Shift + C` | Copy the output |
| `Ctrl/Cmd + S` | Save or load a recipe |
| `Ctrl/Cmd + L` | Share |
| `Esc` | Close any dialog |

## What DecodeBox will not do

It will not render an SVG. SVG is markup that can carry script, and this is a
tool for untrusted input.

It will not verify a JWT signature. That needs the key, and a tool that says
"valid" without one would be worse than saying nothing.

It will not send anything anywhere. There is no server. See
[DEPLOYMENT.md](DEPLOYMENT.md) if you want to confirm that for yourself.
