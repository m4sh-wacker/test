# Security Policy

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Use GitHub's private vulnerability reporting on this repository
(Security → Report a vulnerability), or email the project lead directly.

Please include:

- A description of the issue and its impact.
- The exact input, recipe, or steps needed to reproduce it.
- The browser and version you observed it in.
- Any proof-of-concept, defanged if it is genuinely malicious.

You will get an acknowledgement within 5 working days and an assessment within 10. We will keep
you updated as we work on a fix, and we will credit you in the release notes unless you would
rather we did not.

Please give us reasonable time to release a fix before disclosing publicly.

## Scope

DecodeBox runs entirely in the browser with no backend, so the threat model is narrower than a
typical web application but not empty. In scope:

- **Cross-site scripting** through any path where input, decoded output, recipe data, or a shared
  URL reaches the DOM. This is the primary risk in this application.
- **Content Security Policy bypass**, or any change that requires weakening the CSP.
- **Prototype pollution** via recipe JSON, imported recipe files, or the URL hash.
- **Denial of service** on the user's own browser: an input or recipe that hangs the tab, exhausts
  memory, or triggers unbounded recursion in the detection engine.
- **Data exfiltration** — any code path that causes input, output, or recipe data to leave the
  browser. There should be none. If you find one, that is a serious finding.
- **Supply chain**: a malicious or compromised dependency reaching the published bundle.
- **Incorrect cryptographic output** where a user could reasonably rely on it.

Out of scope:

- Findings that require the user to paste attacker-supplied content while a browser extension or
  local malware is already compromising them.
- Missing security headers on a deployment we do not control.
- Automated scanner output with no demonstrated impact.
- Social engineering of maintainers.

## Known limitation: clickjacking headers

The application ships its Content Security Policy in a `<meta>` element, because GitHub Pages
cannot set response headers. Browsers ignore `frame-ancestors` when it arrives that way, so the
published site does not currently prevent being framed. This is a hosting constraint rather than
an oversight, and it is why the policy does not pretend to include the directive.

If you deploy DecodeBox behind a proxy or on a host you control, add these as real headers:

```text
Content-Security-Policy: frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
```

Reports of framing on the GitHub Pages deployment are welcome as issues rather than security
reports — the constraint is public and documented here.

## Untrusted input is the product

DecodeBox is designed to process hostile, malformed, and deliberately adversarial data. Operations
are expected to fail loudly on bad input, never to crash the application, hang the tab, or execute
anything. A crash on malformed input is a bug; an execution on malformed input is a vulnerability.

## Supported versions

During pre-1.0 development, only the latest release on the default branch receives security fixes.
