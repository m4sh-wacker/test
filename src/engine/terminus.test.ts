import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { autoDecode, describeChain, terminusOf, terminusName, lastLayer } from './index';
import { terminalIdentification } from './detection/identify';

/**
 * The chain has to say why it stopped.
 *
 * Showing only the layers makes two opposite outcomes look identical: a chain
 * that ended on a SHA-256 is finished, and a chain that ended because the depth
 * limit was hit is a partial result somebody should keep pulling at. These
 * tests pin the distinction, and pin the ordering that makes it correct —
 * decode first, identify only when nothing decodes.
 */

const b64 = (text: string): string => Buffer.from(text, 'latin1').toString('base64');

describe('how a chain ends', () => {
  it('ends on plain content, and says so', async () => {
    const root = await autoDecode('The deployment failed twice last night and nobody was paged.');
    const end = terminusOf(root);
    expect(end?.reason).toBe('plain');
    expect(end?.complete).toBe(true);
    expect(describeChain(root)).toBe('Plain text');
  });

  it('ends on a digest by naming it rather than by running out', async () => {
    // SHA-256 of 'password', as node's crypto computes it.
    const digest = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';
    const root = await autoDecode(digest);
    const end = terminusOf(root);

    expect(end?.reason).toBe('identified');
    expect(end?.complete).toBe(true);
    expect(end?.identification?.oneWay).toBe(true);
    expect(end?.identification?.matches[0]?.name).toBe('SHA-256');
    expect(end?.note).toMatch(/one-way/);
    expect(describeChain(root)).toBe('SHA-256');
  });

  it('names the digest at the bottom of a multi-stage chain', async () => {
    // MD5 of 'test', wrapped twice.
    const root = await autoDecode(b64(b64('098f6bcd4621d373cade4e832627b4f6')));

    expect(describeChain(root)).toBe('Base64 → Base64 → MD5');
    expect(terminusName(root)).toBe('MD5');
    expect(terminusOf(root)?.identification?.oneWay).toBe(true);
    // The layers themselves are still the decode path, unchanged by the ending.
    expect(lastLayer(root).output).toBe('098f6bcd4621d373cade4e832627b4f6');
  });

  it('prefers a decode over an identification when the value does both', async () => {
    // Thirty-two hex digits, so digest-shaped — but they are also text. The
    // decode is the better answer, and asking "is this a hash?" first would
    // have thrown it away.
    const hex = Buffer.from('Hello, world!!!!', 'latin1').toString('hex');
    expect(hex).toHaveLength(32);
    expect(terminalIdentification(hex)?.matches[0]?.name).toBe('MD5');

    const root = await autoDecode(hex);
    expect(lastLayer(root).output).toBe('Hello, world!!!!');
    expect(terminusOf(root)?.reason).toBe('plain');
  });

  it('ends a JWT on the signature rather than on the payload', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.' +
      'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    const root = await autoDecode(token);
    const end = terminusOf(root);

    expect(describeChain(root)).toBe('JWT');
    expect(end?.complete).toBe(true);
    expect(end?.note).toMatch(/signature/i);
    expect(end?.note).toMatch(/never decoded|verified|JWT Verify/i);
  });

  it('admits when it stopped early instead of finishing', async () => {
    // Eight Base64 wrappings, one more than the default depth allows.
    let nested = 'The flag is not here.';
    for (let i = 0; i < 8; i++) nested = b64(nested);

    const root = await autoDecode(nested, { maxDepth: 3 });
    const end = terminusOf(root);

    expect(end?.reason).toBe('depth');
    expect(end?.complete).toBe(false);
    // The ellipsis is the whole point: a partial chain must not read complete.
    expect(describeChain(root).endsWith('→ …')).toBe(true);
  });

  it('admits when the clock ran out', async () => {
    let nested = 'Something at the bottom.';
    for (let i = 0; i < 6; i++) nested = b64(nested);

    const root = await autoDecode(nested, { budgetMs: 0 });
    expect(terminusOf(root)?.reason).toBe('budget');
    expect(terminusOf(root)?.complete).toBe(false);
  });

  it('puts the ending on the last layer and nowhere else', async () => {
    const root = await autoDecode(b64(b64('d41d8cd98f00b204e9800998ecf8427e')));
    const chain: typeof root[] = [];
    for (let node: typeof root | undefined = root; node; node = node.children[0]) chain.push(node);

    expect(chain).toHaveLength(3);
    for (const node of chain.slice(0, -1)) expect(node.terminus).toBeUndefined();
    expect(chain[chain.length - 1]!.terminus).toBeDefined();
  });
});

describe('terminalIdentification', () => {
  it('accepts a one-way digest and a certain artefact', async () => {
    expect(terminalIdentification('$2b$12$' + 'a'.repeat(53))?.matches[0]?.name).toBe('bcrypt');
    expect(terminalIdentification('550e8400-e29b-41d4-a716-446655440000')?.matches[0]?.name).toBe(
      'UUID',
    );
  });

  it('refuses what merely looks structured', async () => {
    // JSON is identifiable but not terminal — it has content inside it.
    expect(terminalIdentification('{"user":"admin","role":"root"}')).toBeNull();
    expect(terminalIdentification('nothing in particular here')).toBeNull();
  });
});

/**
 * The commonest thing anyone drops into this tool is a file, and the commonest
 * thing anyone pastes is the Base64 of one. Both used to end at "Plain text":
 * detection had no idea what a PNG was, so a dropped picture was unrecognised
 * and a Base64 picture would not even decode — the decoder saw binary noise and
 * scored it below the threshold.
 */
describe('files', () => {
  /** A real 1x1 PNG, the smallest one that is still a valid file. */
  const PNG_B64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const PNG = Buffer.from(PNG_B64, 'base64').toString('latin1');

  it('names a file that was dropped in, rather than calling it plain text', async () => {
    const root = await autoDecode(PNG);
    expect(describeChain(root)).toBe('PNG image');
    expect(terminusOf(root)?.reason).toBe('identified');
    expect(terminusOf(root)?.identification?.matches[0]?.reason).toMatch(/89 50 4E 47/);
  });

  it('decodes the Base64 of a picture, because it sees the file inside', async () => {
    const root = await autoDecode(PNG_B64);
    expect(describeChain(root)).toBe('Base64 → PNG image');
    expect(lastLayer(root).output).toBe(PNG);
  });

  it('does not call a picture one-way', async () => {
    // 'nothing further decodes' and 'cryptographically irreversible' are
    // different claims. Telling somebody their PNG is a one-way hash, or
    // offering to crack it, is worse than saying nothing.
    const found = terminalIdentification(PNG)!;
    expect(found.terminal).toBe(true);
    expect(found.oneWay).toBe(false);
    expect(terminusOf(await autoDecode(PNG))?.note).not.toMatch(/one-way/);
  });

  it('still unwraps a container rather than just naming it', async () => {
    // gzip has a signature too, but something decodes it — and identification
    // is only asked after decoding runs out, so the decode still wins.
    const gzipped = gzipSync(Buffer.from('The quick brown fox jumps over the lazy dog.'));
    const root = await autoDecode(gzipped.toString('latin1'));
    expect(describeChain(root)).toMatch(/gzip/i);
    expect(lastLayer(root).output).toContain('quick brown fox');
  });
});
