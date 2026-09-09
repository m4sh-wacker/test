# Roadmap

The plan for the first year. Dates are targets, not commitments — but the ordering is deliberate,
and shipping something usable early matters more than shipping something complete late.

## Phase 1 — Foundations and a usable v0.1

Target: **months 1–2**. The goal is a tool a person can actually use, deployed publicly, as
early as possible. A narrow tool that works beats a broad one that does not exist yet.

- Repository, licensing, contribution guidelines, CI, and automated deployment to GitHub Pages.
- The engine seam fixed and documented, so the interface and the engine can proceed in parallel.
- Core operations: Base64, Base32, Hex, URL, HTML entity, charcode, binary, decimal, ROT13,
  case transforms, JSON beautify/minify.
- The paste-first workspace: one input, a verdict, the layer chain, and the reasoning panel.
- Manual mode: operation search, recipe building, argument controls for every declared type.
- Dark and light themes, keyboard shortcuts, and a mobile layout.
- Share links, saved recipes, breakpoints and single-stepping.
- Flow control — fork, merge, subsection, register, labels and jumps.
- Web Worker execution for large inputs.
- Usage, deployment and operation-authoring documentation.

**v0.1 ships at the end of this phase.** It will be narrow. That is fine — a narrow tool that
works beats a broad one that does not exist yet.

## Phase 2 — The detection engine

Target: **months 3–5**. This is the part of the project that justifies its existence, and it
gets the most time.

- The signal framework: entropy, character set, length rules, pattern matching, magic bytes, byte
  frequency, structural validity — each producing a weight and a human-readable justification.
- Confidence scoring that combines signals honestly, tuned against a real corpus and biased
  against false positives.
- The detection pane: ranked candidates with visible evidence, one click from becoming a recipe.
- Recursive `autoDecode` and the nested layer tree, bounded on depth, node count and time.
- Deep scan mode: single-byte XOR, bit rotation, character-encoding permutations.
- A detection test corpus built from real payloads, with accuracy and false-positive rate tracked
  as a number that must not regress.

**v0.2 ships at the end of this phase**, with detection as the headline.

## Phase 3 — Breadth and hardening

Target: **months 6–9**.

- Operation coverage: the long tail of encodings, archive formats and hashes. Shipped.
- Line-ending selector on the input. The character-encoding selector shipped alongside the fix
  to the byte boundary: text becomes bytes once, in the pane, rather than in every operation.
- Asymmetric cryptography: RSA and ECDSA signing and verification, key conversion, certificate
  and PGP key parsing. Shipped.
- Image and media handling beyond header parsing. Shipped, with the codecs written here rather
  than borrowed from a canvas — colour management and premultiplied alpha corrupt the low bits
  a forensic reader is looking at.
- CTF mode: flag search across every layer, index-of-coincidence analysis, Caesar and Vigenère
  key recovery, and ranked hints that each carry the measurement behind them. Shipped; it was
  not in the original plan.
- Accessibility audit against WCAG 2.1 AA, and a real mobile pass — not a smaller desktop layout.
- Internationalisation infrastructure and RTL verification.
- Security review of the application itself: CSP, prototype pollution surfaces, recipe and URL
  parsing, dependency audit.

## Phase 4 — v1.0 and community

Target: **months 10–12**.

- Complete documentation: usage guide, operation reference, architecture notes, a guide to
  writing an operation.
- Deployment documentation for offline and air-gapped use — a genuine requirement for the
  incident-response audience.
- Stable v1.0 release under Apache 2.0.
- Contribution paths opened up properly: good first issues, an operation-authoring guide, and
  review turnaround people can rely on.

## Beyond v1.0

Not committed, in rough order of interest:

- A headless build of the engine usable as a library and from a CLI, so DecodeBox can run inside
  pipelines and CI rather than only in a browser tab. The engine has no DOM dependencies, so this
  is a packaging question rather than a rewrite.
- A machine-readable detection report for automated triage.
- Plugin-style operation loading for organisation-specific formats.

## What is deliberately not planned

- Any server-side component, account system, or hosted storage. The absence of a backend is the
  product, not a limitation to be fixed later.
- Chasing an operation count. Breadth follows from what the domain actually demands, not from a
  target, and a number is not a design objective. Being good at identifying unknown data is.
