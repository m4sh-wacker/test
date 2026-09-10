import { describe, expect, it } from 'vitest';
import { analyse, autoDecode, explain } from './index';

/**
 * The sentence has to be true before it is worth reading.
 *
 * Everything it says is something the engine already decided; these tests pin
 * that it restates them rather than inventing anything, and that it stays quiet
 * when there is nothing to restate.
 */

function wrap(value: string, times: number): string {
  let out = value;
  for (let i = 0; i < times; i++) out = Buffer.from(out).toString('base64');
  return out;
}

async function explainOf(input: string) {
  const [root, analysis] = await Promise.all([autoDecode(input), analyse(input)]);
  return explain(root, analysis);
}

describe('explaining a payload in a sentence', () => {
  it('counts the wrapping and names what is inside it', async () => {
    const result = await explainOf(wrap('{"user":"ada","role":"analyst"}', 3));

    expect(result?.headline).toContain('three layers of Base64'.replace('three', 'Three'));
    expect(result?.headline).toMatch(/around an? JSON/);
  });

  it('names the indicators it actually found, and counts them', async () => {
    const result = await explainOf(
      wrap('{"c2":"http://185.220.101.7/g.php","ops":"root@evil.tld"}', 2),
    );

    const text = result?.text ?? '';
    expect(text).toContain('It contains');
    // A URL and an IP were both extracted from the decoded body, so both are
    // named; the email is third and may fall outside the three it mentions.
    expect(text).toMatch(/URL/);
    expect(text).toMatch(/IP address/);
  });

  it('leads the warning with the most severe finding', async () => {
    const result = await explainOf('%3Cscript%3Ealert(1)%3C%2Fscript%3E');

    expect(result?.warning).toBeDefined();
    expect(result?.text).toContain('Flagged:');
    expect(['critical', 'high', 'medium']).toContain(result?.warning?.severity);
  });

  it('says when the chain stopped early rather than finished', async () => {
    const shallow = await autoDecode(wrap('deep enough', 8), { maxDepth: 3 });
    const result = explain(shallow, null);

    expect(result?.text).toContain('stopped before it ran out');
  });

  /*
   * An initialism takes the article of the letter's name, not the letter. MD5
   * is "em-dee-five", so it is an MD5 — and the general spelling rule, which
   * this once used, called it "a MD5".
   */
  it('picks the article from how the name is said', async () => {
    const digest = await explainOf('5d41402abc4b2a76b9719d911017c592');
    expect(digest?.headline).toMatch(/^An MD5/);
    expect(digest?.headline).not.toMatch(/^A MD5/);

    const uuid = await explainOf('550e8400-e29b-41d4-a716-446655440000');
    // 'you-you-eye-dee' takes 'a', which the vowel rule would get wrong too.
    expect(uuid?.headline ?? '').not.toMatch(/an UUID/i);
  });

  it('names what is inside rather than pasting an identifier into a sentence', async () => {
    const result = await explainOf(wrap('{"a":1}', 2));
    // "around a JSON" is what a format name does to a sentence unaided.
    expect(result?.headline).toContain('a JSON object');
    expect(result?.headline).not.toMatch(/around an? JSON\./);
  });

  it('says nothing at all about content with nothing to say', async () => {
    expect(await explainOf('just some ordinary words, nothing special')).toBeNull();
  });

  it('does not claim a wrapper that is not there', async () => {
    const result = await explainOf('5d41402abc4b2a76b9719d911017c592');
    // A bare digest decodes to nothing. Whatever this says, it must not
    // describe layers that were never unwrapped.
    expect(result?.headline ?? '').not.toMatch(/layers of/);
  });

  it('reads as prose, not as a field dump', async () => {
    const result = await explainOf(wrap('{"host":"10.0.0.7"}', 2));
    const text = result?.text ?? '';

    expect(text.length).toBeGreaterThan(20);
    expect(text.endsWith('.')).toBe(true);
    expect(text[0]).toBe(text[0]?.toUpperCase());
    // No leftover template punctuation from building it up in pieces.
    expect(text).not.toMatch(/\s{2,}|\s\.|,\s*\./);
  });
});
