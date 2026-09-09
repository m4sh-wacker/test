import { OperationError } from '../types';
import { latin1ToBytes } from '../core/bytes';
import { arg, type Operation } from './types';

function decodeJwtSegment(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const full = padded + '='.repeat((4 - (padded.length % 4)) % 4);
  try {
    return new TextDecoder().decode(latin1ToBytes(atob(full)));
  } catch {
    throw new OperationError('JWT segment is not valid Base64url.');
  }
}

export const utilOperations: Operation[] = [
  {
    id: 'jwt-decode',
    name: 'JWT Decode',
    category: 'Utils',
    description: 'Splits a JSON Web Token and decodes its header and payload.',
    aliases: ['jwt', 'json web token', 'decode jwt'],
    args: [],
    run: (input) => {
      const parts = input.trim().split('.');
      if (parts.length < 2) {
        throw new OperationError('A JWT has at least two dot-separated segments.');
      }
      const header = JSON.parse(decodeJwtSegment(parts[0]!)) as Record<string, unknown>;
      const payload = JSON.parse(decodeJwtSegment(parts[1]!)) as Record<string, unknown>;

      // Timestamp claims are seconds since the epoch, which is not something a
      // person can read at a glance. Annotate rather than rewrite.
      const annotated: Record<string, unknown> = { ...payload };
      for (const claim of ['exp', 'iat', 'nbf'] as const) {
        const value = payload[claim];
        if (typeof value === 'number') {
          annotated[`${claim}_readable`] = new Date(value * 1000).toISOString();
        }
      }

      return JSON.stringify(
        {
          header,
          payload: annotated,
          signature: parts[2] ? `${parts[2].slice(0, 24)}… (not verified)` : '(none)',
        },
        null,
        2,
      );
    },
    detection: {
      formatName: 'JWT',
      pattern: /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]*)?$/,
      minLength: 20,
      terminalNote:
        'The header and payload are all of the decodable content. The third segment is a ' +
        'signature or a MAC: it is checked against a key, never decoded — use JWT Verify.',
    },
  },
  {
    id: 'json-beautify',
    name: 'JSON Beautify',
    category: 'Code tidy',
    description: 'Formats JSON with consistent indentation.',
    aliases: ['pretty json', 'format json', 'prettify'],
    args: [{ name: 'Indent', type: 'number', value: 2 }],
    run: (input, args) => {
      try {
        return JSON.stringify(JSON.parse(input), null, Number(arg(args, 'Indent', 2)));
      } catch (error) {
        throw new OperationError(
          `Not valid JSON: ${error instanceof Error ? error.message : 'parse failed'}`,
        );
      }
    },
    detection: {
      formatName: 'JSON',
      pattern: /^\s*[[{][\s\S]*[\]}]\s*$/,
      minLength: 2,
    },
  },
  {
    id: 'json-minify',
    name: 'JSON Minify',
    category: 'Code tidy',
    description: 'Removes all optional whitespace from JSON.',
    aliases: ['compact json', 'minify json'],
    args: [],
    run: (input) => {
      try {
        return JSON.stringify(JSON.parse(input));
      } catch {
        throw new OperationError('Not valid JSON.');
      }
    },
  },
  {
    id: 'to-upper-case',
    name: 'To Upper case',
    category: 'Utils',
    description: 'Converts the input to upper case.',
    aliases: ['uppercase', 'upper'],
    args: [],
    run: (input) => input.toUpperCase(),
  },
  {
    id: 'to-lower-case',
    name: 'To Lower case',
    category: 'Utils',
    description: 'Converts the input to lower case.',
    aliases: ['lowercase', 'lower'],
    args: [],
    run: (input) => input.toLowerCase(),
  },
  {
    id: 'reverse',
    name: 'Reverse',
    category: 'Utils',
    description: 'Reverses the order of characters or lines.',
    aliases: ['flip', 'backwards'],
    args: [{ name: 'By', type: 'option', value: 'Character', options: ['Character', 'Line'] }],
    run: (input, args) =>
      arg(args, 'By', 'Character') === 'Line'
        ? input.split('\n').reverse().join('\n')
        : Array.from(input).reverse().join(''),
  },
  {
    id: 'remove-whitespace',
    name: 'Remove whitespace',
    category: 'Utils',
    description: 'Strips spaces, tabs, and line breaks.',
    aliases: ['strip whitespace', 'trim all'],
    args: [],
    run: (input) => input.replace(/\s+/g, ''),
  },
  {
    id: 'remove-null-bytes',
    name: 'Remove null bytes',
    category: 'Utils',
    description: 'Strips 0x00 bytes, which often pad UTF-16 data.',
    aliases: ['strip nulls'],
    args: [],
    run: (input) => input.replace(/\0/g, ''),
  },
  {
    id: 'sort',
    name: 'Sort',
    category: 'Utils',
    description: 'Sorts the lines of the input.',
    aliases: ['order lines'],
    args: [
      { name: 'Order', type: 'option', value: 'Alphabetical', options: ['Alphabetical', 'Length'] },
      { name: 'Reverse', type: 'boolean', value: false },
    ],
    run: (input, args) => {
      const lines = input.split('\n');
      const sorted =
        arg(args, 'Order', 'Alphabetical') === 'Length'
          ? lines.sort((a, b) => a.length - b.length)
          : lines.sort((a, b) => a.localeCompare(b));
      return (arg(args, 'Reverse', false) ? sorted.reverse() : sorted).join('\n');
    },
  },
  {
    id: 'unique',
    name: 'Unique',
    category: 'Utils',
    description: 'Removes duplicate lines, keeping the first occurrence.',
    aliases: ['dedupe', 'distinct', 'uniq'],
    args: [],
    run: (input) => [...new Set(input.split('\n'))].join('\n'),
  },
  {
    id: 'parse-timestamp',
    name: 'Parse Timestamp',
    category: 'Date / Time',
    description: 'Interprets a number as a Unix timestamp in seconds or milliseconds.',
    aliases: ['unix time', 'epoch', 'from timestamp'],
    args: [],
    run: (input) => {
      const value = Number(input.trim());
      if (!Number.isFinite(value)) throw new OperationError('Not a number.');
      // Ten digits is seconds, thirteen is milliseconds. Anything between is
      // ambiguous, so show both readings rather than picking one.
      const asSeconds = new Date(value * 1000);
      const asMillis = new Date(value);
      const lines = [`Input: ${value}`, ''];
      if (!Number.isNaN(asSeconds.getTime()) && Math.abs(asSeconds.getUTCFullYear() - 2025) < 80) {
        lines.push(`As seconds:      ${asSeconds.toISOString()}`);
      }
      if (!Number.isNaN(asMillis.getTime()) && Math.abs(asMillis.getUTCFullYear() - 2025) < 80) {
        lines.push(`As milliseconds: ${asMillis.toISOString()}`);
      }
      if (lines.length === 2) throw new OperationError('Not a plausible Unix timestamp.');
      return lines.join('\n');
    },
  },
];
