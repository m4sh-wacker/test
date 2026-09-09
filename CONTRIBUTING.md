# Contributing to OWASP DecodeBox

Thanks for considering a contribution. This document covers how to get set up, what we are
looking for, and the standards a change needs to meet.

By participating you agree to the
[OWASP Code of Conduct](https://owasp.org/www-policy/operational/code-of-conduct).

## Getting set up

Requires Node.js 20 or later, the floor CI builds against. `.nvmrc` pins 22 for development.

```bash
npm install
npm run dev
```

Before opening a pull request:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

All four must pass. CI runs the same commands.

## What we most want

**New transformation operations.** This is the highest-value contribution and the easiest place
to start. Operations are self-contained modules — see "Adding an operation" below.

**Detection heuristics.** Improvements to how confidently and correctly we identify a format,
and especially better *evidence* — a heuristic that cannot explain itself is not one we want.
False positives are worse than missed detections here.

**Test cases from real data.** If DecodeBox misidentifies something, a failing test with the
input that broke it is a genuinely useful contribution on its own.

**Accessibility and internationalisation fixes.** These are first-class requirements, not polish.

## Adding an operation

An operation is a module that declares its metadata and exposes a `run` function. It must:

1. Declare a stable `id` (kebab-case slug), a display `name`, a `category` from the existing set,
   a one-line `description`, and `aliases` that people might plausibly search for.
2. Declare its arguments with correct types so the UI can render controls automatically. Never
   render your own UI — the interface builds itself from the argument definitions.
3. Be pure and synchronous where possible. If it must be async, it must be cancellable.
4. Handle malformed input by throwing a descriptive `Error`, never by crashing or hanging.
   Assume every input is hostile and possibly enormous.
5. Ship with tests covering: a normal case, an edge case, and a malformed-input case.

If the operation can also participate in automatic detection, declare its detection criteria
(entropy range, character-set pattern, magic bytes). Be conservative — a criterion that matches
too eagerly degrades detection quality for everyone.

## Code standards

- TypeScript strict mode. No `any` in application code.
- No `eval`, no `new Function`, no `dangerouslySetInnerHTML`, no `innerHTML` assignment. The app
  must keep working under a CSP with no `unsafe-inline` and no `unsafe-eval`.
- No new runtime dependency without discussion first. Every dependency in a security tool is
  someone else's supply chain in your threat model. Prefer writing 40 lines to adding a package.
- Components stay small and single-purpose. Logic belongs in hooks and the store, not in JSX.
- User-facing strings go in the i18n map, never hardcoded in components.
- Layout uses logical CSS properties (`ms`/`me`/`start`/`end`), never physical ones — the app
  must render correctly in RTL.
- Comment the reasoning, not the mechanics. If the code needs a comment to explain *what* it
  does, rewrite the code instead.

## Pull requests

- One logical change per pull request. A PR that adds an operation and refactors the store is
  two PRs.
- Write a description that explains the reasoning, not just the diff. If it fixes an issue,
  link it.
- Include tests. A PR that changes behaviour without a test that would have caught the old
  behaviour will be asked for one.
- If your change affects the interface, include a before/after screenshot in both light and dark
  themes.
- Keep the commit history readable. Squash noise before requesting review.

## Reporting bugs

Open an issue using the bug report template. The single most useful thing you can include is the
**exact input** that triggered the problem — defanged if it is genuinely malicious. "Base64
decoding is broken" is not actionable; a 40-character string that decodes wrong is.

## Security issues

Do not open a public issue. Follow [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0,
the same license that covers this project.
