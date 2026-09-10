import { gzipSync } from 'node:zlib';
import type { Layer } from './index';
import { describe, expect, it } from 'vitest';
import {
  autoDecode,
  chainConfidence,
  describeChain,
  describeRuns,
  lastLayer,
  summariseChain,
  terminusOf,
  terminusName,
  toChain,
} from './index';
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

/**
 * Deep nesting shrinks every layer, so the detector meets its own length limits
 * exactly when the chain gets interesting. Every part of this was wrong once.
 */
describe('short layers', () => {
  // Five Base64 wrappings. Reported from real use twice: first three unwrapped
  // and the fourth was called plain text; then four unwrapped and the fifth was
  // called too short to judge. It is 'mmd' all the way down.
  const NESTED = 'VjFkNGFtVkhSak5RVkRBOQ==';

  it('does not stop on a short Base64 layer that carries its padding', async () => {
    // 'Ylcxaw==' is eight characters and was read as six, because the length
    // was checked twice — once by minLength over the whole string, once by the
    // pattern over the part before the padding.
    const root = await autoDecode(NESTED);
    expect(describeChain(root)).toContain('Base64 → Base64 → Base64 → Base64');
  });

  it('follows the chain past the length floor when the chain is the evidence', async () => {
    // 'bW1k' is four characters, which every detector declines on sight. It is
    // also the fifth Base64 layer of five, and decoding it once more gives
    // 'mmd'. Refusing on length alone threw away everything the four layers
    // above it had already established.
    const root = await autoDecode(NESTED);
    expect(lastLayer(root).output).toBe('mmd');
    expect(toChain(root)).toHaveLength(6);
  });

  it('leaves a short value alone when nothing above it vouches for the decode', async () => {
    // The same four characters with no history. There is no chain to lean on,
    // so the floor stands and the value is left as it is.
    const end = terminusOf(await autoDecode('bW1k'));
    expect(end?.reason).toBe('tooShort');
    expect(lastLayer(await autoDecode('bW1k')).output).toBe('bW1k');
  });

  it('refuses to continue when the extra decode is not clean text', async () => {
    // Three Base64 layers down to 'abcd', which is valid Base64 and decodes to
    // 0x69 0xb7 0x1d. Being decodable is not evidence — every four characters
    // in the alphabet are. Producing text is the evidence, and this does not.
    const root = await autoDecode('V1ZkS2FscEJQVDA9');
    expect(lastLayer(root).output).toBe('abcd');
    expect(terminusOf(root)?.reason).toBe('tooShort');
  });

  it('admits it cannot judge what is left rather than calling it content', async () => {
    const end = terminusOf(await autoDecode(NESTED));
    expect(end?.reason).toBe('tooShort');
    expect(end?.complete).toBe(false);
    expect(end?.note).not.toMatch(/this is the content/i);
  });

  it('still names something short when it can', async () => {
    // A UUID is short too, and naming it is a real answer. Identification is
    // asked before the length excuse for exactly this reason.
    const end = terminusOf(await autoDecode('550e8400-e29b-41d4-a716-446655440000'));
    expect(end?.reason).toBe('identified');
  });
});

/**
 * A chain of seven identical layers is one finding, not seven. Drawn as seven
 * equal chips it overflowed its own container at 1440px and pushed the decoded
 * result below the fold — the answer lost the argument to the working.
 */
describe('summarising a chain', () => {
  const SEVEN = (() => {
    let value = 'the flag is here';
    for (let i = 0; i < 7; i++) value = Buffer.from(value).toString('base64');
    return value;
  })();

  it('collapses a run of one format into a count', async () => {
    const root = await autoDecode(SEVEN, { maxDepth: 12 });
    const runs = summariseChain(root);

    expect(runs).toHaveLength(1);
    expect(runs[0]?.format).toBe('Base64');
    expect(runs[0]?.count).toBe(7);
    expect(describeRuns(runs)).toBe('Base64 x7');
  });

  it('keeps separate formats separate, and only collapses neighbours', () => {
    const layer = (format: string, depth: number): Layer => ({
      id: `${format}-${depth}`,
      depth,
      format,
      confidence: 0.8,
      byteLength: 1,
      output: '',
      evidence: [],
      steps: [],
      children: [],
    });

    // Input → A → A → B → A: the last A is not part of the first run.
    const root = layer('Input', 0);
    let node = root;
    for (const [format, depth] of [['A', 1], ['A', 2], ['B', 3], ['A', 4]] as const) {
      const child = layer(format, depth);
      node.children.push(child);
      node = child;
    }

    expect(describeRuns(summariseChain(root))).toBe('A x2 - B - A');
  });

  it('reports the weakest layer, not the average of them', async () => {
    const root = await autoDecode(SEVEN, { maxDepth: 12 });
    const confidences = toChain(root).slice(1).map((l) => l.confidence);

    expect(chainConfidence(root)).toBe(Math.min(...confidences));
  });

  it('says nothing about a chain that decoded nothing', async () => {
    const root = await autoDecode('just some ordinary words here');
    expect(summariseChain(root)).toEqual([]);
    expect(chainConfidence(root)).toBe(0);
  });

  /*
   * The depth limit is a real bound, not a formality: raising it is the action
   * the interface offers when a chain stops early, so it has to actually reach
   * further.
   */
  it('goes further when allowed further', async () => {
    const shallow = await autoDecode(SEVEN, { maxDepth: 3 });
    const deep = await autoDecode(SEVEN, { maxDepth: 12 });

    expect(terminusOf(shallow)?.reason).toBe('depth');
    expect(terminusOf(shallow)?.complete).toBe(false);
    expect(toChain(shallow)).toHaveLength(4);

    expect(toChain(deep).length).toBeGreaterThan(toChain(shallow).length);
    expect(lastLayer(deep).output).toBe('the flag is here');
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
