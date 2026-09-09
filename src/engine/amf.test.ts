import { describe, expect, it } from 'vitest';
import { bake, renderText } from './index';
import { getOperation } from './operations';
import type { Recipe } from './types';

/**
 * The AMF streams here are written out byte by byte from the specification
 * rather than produced by our own encoder, so a decoder that agrees with the
 * encoder but not with Adobe fails these.
 */

type Entry = string | [string, Record<string, string | number | boolean>];

function recipe(...entries: Entry[]): Recipe {
  return {
    id: 'test',
    name: 'test',
    steps: entries.map((entry, i) => {
      const [opId, overrides] = typeof entry === 'string' ? [entry, {}] : entry;
      const op = getOperation(opId);
      if (!op) throw new Error(`Unknown operation '${opId}'`);
      return {
        uid: `s${i}`,
        opId,
        args: op.args.map((a) => ({ ...a, value: overrides[a.name] ?? a.value })),
        disabled: false,
      };
    }),
  };
}

async function run(input: string, ...entries: Entry[]): Promise<string> {
  const result = await bake(input, recipe(...entries));
  if (result.error) throw new Error(`${String(entries[0])}: ${result.error.message}`);
  return renderText(result.output);
}

/** Decodes a stream written as hex, which is how the vectors below are given. */
async function decode(hex: string, format = 'AMF3'): Promise<unknown> {
  return JSON.parse(await run(hex, 'from-hex', ['amf-decode', { Format: format, Indent: 0 }]));
}

async function encodeHex(json: unknown, format = 'AMF3'): Promise<string> {
  return run(JSON.stringify(json), ['amf-encode', { Format: format }], [
    'to-hex',
    { Delimiter: 'None' },
  ]);
}

describe('AMF3 decode', () => {
  it('reads an anonymous dynamic object', async () => {
    // 0a 0b: object, literal traits, dynamic, no sealed properties
    // 01: empty class name · 03 61: "a" · 04 01: integer 1
    // 03 62: "b" · 06 05 68 69: string "hi" · 01: end of dynamic members
    expect(await decode('0a0b010361040103620605686901')).toEqual({ a: 1, b: 'hi' });
  });

  it('follows a string reference back to the string table', async () => {
    // 09 05: array of 2 · 01: no associative part
    // 06 0b hello: literal string, which enters the table as index 0
    // 06 00: reference to that same string
    expect(await decode('090501060b68656c6c6f0600')).toEqual(['hello', 'hello']);
  });

  it('reads the signed range of a U29 integer', async () => {
    expect(await decode('0400')).toBe(0);
    expect(await decode('047f')).toBe(127);
    expect(await decode('048100')).toBe(128);
    expect(await decode('04ffffffff')).toBe(-1);
    expect(await decode('04bfffffff')).toBe(0x0fffffff);
  });

  it('reads a double when the number is not an integer', async () => {
    expect(await decode('05400921fb54442d18')).toBeCloseTo(Math.PI, 12);
  });

  it('reads the constants', async () => {
    expect(await decode('00')).toBe(null); // undefined
    expect(await decode('01')).toBe(null);
    expect(await decode('02')).toBe(false);
    expect(await decode('03')).toBe(true);
  });

  it('reads a date as an ISO timestamp', async () => {
    expect(await decode('0801' + '0000000000000000')).toBe('1970-01-01T00:00:00.000Z');
    // 1 262 304 000 000 ms = 2010-01-01, as an IEEE-754 double.
    expect(await decode('0801' + '42725e72e7800000')).toBe('2010-01-01T00:00:00.000Z');
  });

  it('reads a byte array as hex', async () => {
    expect(await decode('0c07010203')).toBe('010203');
  });

  it('reads a typed object and keeps its class name', async () => {
    // 0a 1b: literal traits, dynamic, one sealed property
    // 09 55 73 65 72: class name "User" · 05 69 64: property "id"
    // 04 07: integer 7 · 01: no dynamic members after it
    expect(await decode('0a1b' + '0955736572' + '056964' + '0407' + '01')).toEqual({
      $class: 'User',
      id: 7,
    });
  });

  it('promotes an array with string keys to an object', async () => {
    // 09 03: one dense item · 03 6b 06 03 76: "k" -> "v" · 01: end · 04 09: 9
    expect(await decode('0903' + '036b' + '060376' + '01' + '0409')).toEqual({ k: 'v', '0': 9 });
  });

  it('refuses an externalizable class instead of guessing at its bytes', async () => {
    // 0a 07: literal traits with the externalizable bit set
    const result = await bake('0a0709466c6578', recipe('from-hex', 'amf-decode'));
    expect(result.error?.message).toMatch(/externalizable/);
  });

  it('reports a truncated stream rather than returning half a value', async () => {
    const result = await bake('0605', recipe('from-hex', 'amf-decode'));
    expect(result.error?.message).toMatch(/ends in the middle/);
  });
});

describe('AMF0 decode', () => {
  it('reads an object of numbers and strings', async () => {
    // 03: object · 0001 61: "a" · 00 <double 1> · 0001 62: "b"
    // 02 0002 6869: string "hi" · 0000 09: end
    expect(
      await decode('03' + '000161' + '003ff0000000000000' + '000162' + '0200026869' + '000009', 'AMF0'),
    ).toEqual({ a: 1, b: 'hi' });
  });

  it('reads booleans, null and a strict array', async () => {
    expect(await decode('0101', 'AMF0')).toBe(true);
    expect(await decode('0100', 'AMF0')).toBe(false);
    expect(await decode('05', 'AMF0')).toBe(null);
    expect(await decode('0a00000002' + '003ff0000000000000' + '004000000000000000', 'AMF0')).toEqual([
      1, 2,
    ]);
  });

  it('reads a typed object and an ECMA array', async () => {
    expect(await decode('10' + '0004' + '55736572' + '000169' + '003ff0000000000000' + '000009', 'AMF0')).toEqual({
      $class: 'User',
      i: 1,
    });
    expect(await decode('08' + '00000001' + '000161' + '003ff0000000000000' + '000009', 'AMF0')).toEqual({
      a: 1,
    });
  });

  it('switches to AMF3 at the avmplus marker', async () => {
    expect(await decode('110a0b010361040101', 'AMF0')).toEqual({ a: 1 });
  });

  it('says which marker it did not understand', async () => {
    const result = await bake('fe', recipe('from-hex', ['amf-decode', { Format: 'AMF0' }]));
    expect(result.error?.message).toMatch(/Unknown AMF0 marker 0xfe/);
  });
});

describe('AMF encode', () => {
  it('writes the bytes the specification calls for', async () => {
    expect(await encodeHex({ a: 1, b: 'hi' })).toBe('0a0b010361040103620605686901');
    expect(await encodeHex([1, 2])).toBe('09050104010402');
  });

  it('writes AMF0 the way the specification calls for', async () => {
    expect(await encodeHex({ a: 1 }, 'AMF0')).toBe('03000161003ff0000000000000000009');
    expect(await encodeHex('hi', 'AMF0')).toBe('0200026869');
    expect(await encodeHex(null, 'AMF0')).toBe('05');
    expect(await encodeHex(true, 'AMF0')).toBe('0101');
  });

  it('round-trips a nested structure through both versions', async () => {
    const value = {
      name: 'decodebox',
      count: 42,
      ratio: 0.5,
      flag: true,
      missing: null,
      list: [1, 'two', false],
      nested: { deep: { deeper: 'yes' } },
    };
    for (const format of ['AMF3', 'AMF0']) {
      const encoded = await run(JSON.stringify(value), ['amf-encode', { Format: format }]);
      const decoded = await run(encoded, ['amf-decode', { Format: format, Indent: 0 }]);
      expect(JSON.parse(decoded), format).toEqual(value);
    }
  });

  it('refuses input that is not JSON', async () => {
    const result = await bake('not json', recipe('amf-encode'));
    expect(result.error?.message).toMatch(/Not valid JSON/);
  });
});
