import { describe, expect, it } from 'vitest';
import { analyse, findInLayers, isValidQuery } from './index';

/**
 * Finding a string in a payload that does not contain it yet.
 *
 * Nesting is what makes this worth having. The browser's own find-in-page can
 * see one of these seven bodies of text; the other six do not exist until
 * something decodes them.
 */

function wrap(value: string, times: number): string {
  let out = value;
  for (let i = 0; i < times; i++) out = Buffer.from(out).toString('base64');
  return out;
}

describe('finding a string across every layer', () => {
  const BURIED = wrap('{"user":"ada","role":"admin"}', 3);

  it('finds a word that only exists after three decodes', async () => {
    const { root } = await analyse(BURIED);

    // The thing being tested, stated plainly: it is not in what you pasted.
    expect(BURIED).not.toContain('admin');

    const hits = findInLayers(root, 'admin');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.depth).toBeGreaterThan(0);
    expect(hits[0]?.path).toContain('Base64');
  });

  it('says where it found it, and what was around it', async () => {
    const { root } = await analyse(BURIED);
    const [hit] = findInLayers(root, 'admin');

    expect(hit?.match).toBe('admin');
    expect(hit?.offset).toBeGreaterThan(0);
    expect(`${hit?.before}${hit?.match}${hit?.after}`).toContain('"role":"admin"');
    // The recipe that reaches the layer is what makes a hit actionable rather
    // than merely interesting.
    expect(hit?.steps.length).toBeGreaterThan(0);
  });

  it('is case insensitive unless told otherwise', async () => {
    const { root } = await analyse(BURIED);

    expect(findInLayers(root, 'ADMIN')).not.toHaveLength(0);
    expect(findInLayers(root, 'ADMIN', { caseSensitive: true })).toHaveLength(0);
  });

  it('reads a pattern as a pattern only when asked', async () => {
    const { root } = await analyse(wrap('id=4021 id=7788', 2));

    // Literal by default, so a payload full of regex punctuation is searchable
    // without anyone escaping anything.
    expect(findInLayers(root, 'id=[0-9]+')).toHaveLength(0);

    const matches = findInLayers(root, 'id=[0-9]+', { regex: true });
    expect(matches.map((m) => m.match)).toEqual(['id=4021', 'id=7788']);
  });

  it('reports the shallowest sighting first', async () => {
    // 'flag' is in the outer text and again three layers down.
    const { root } = await analyse(`flag ${wrap('the flag is here', 3)}`);
    const depths = findInLayers(root, 'flag').map((m) => m.depth);

    expect(depths).toEqual([...depths].sort((a, b) => a - b));
    expect(depths[0]).toBe(0);
  });

  it('treats a broken pattern as no results rather than as a crash', async () => {
    const { root } = await analyse(BURIED);

    expect(() => findInLayers(root, '(unclosed', { regex: true })).not.toThrow();
    expect(findInLayers(root, '(unclosed', { regex: true })).toEqual([]);
    expect(isValidQuery('(unclosed', true)).toBe(false);
    expect(isValidQuery('(unclosed', false)).toBe(true);
  });

  it('does not spin forever on a pattern that matches nothing at all', async () => {
    const { root } = await analyse(BURIED);
    // A zero-width match would never advance lastIndex on its own.
    const matches = findInLayers(root, 'x*', { regex: true, maxPerLayer: 5 });
    expect(matches.length).toBeLessThanOrEqual(5 * 40);
  });

  it('stays inside the caps it advertises', async () => {
    const { root } = await analyse(wrap('a'.repeat(4000), 2));
    const matches = findInLayers(root, 'a', { maxPerLayer: 3, maxTotal: 7 });

    expect(matches.length).toBeLessThanOrEqual(7);
  });

  it('finds nothing in nothing, without complaint', async () => {
    const { root } = await analyse('some ordinary text');
    expect(findInLayers(root, '')).toEqual([]);
    expect(findInLayers(root, 'absent')).toEqual([]);
  });
});
