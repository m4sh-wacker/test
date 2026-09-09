import { OperationError } from '../types';
import { arg, type Operation } from './types';

/** Windows FILETIME counts 100-nanosecond ticks from 1601-01-01. */
const FILETIME_EPOCH_DIFF = 11644473600n;
const TICKS_PER_SECOND = 10000000n;

function requireDate(value: number, what: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new OperationError(`${what} is not a valid date.`);
  return date;
}

function describe(date: Date): string {
  const now = Date.now();
  const delta = date.getTime() - now;
  const absolute = Math.abs(delta);

  const units: Array<[number, string]> = [
    [31557600000, 'year'],
    [2629800000, 'month'],
    [86400000, 'day'],
    [3600000, 'hour'],
    [60000, 'minute'],
    [1000, 'second'],
  ];

  let relative = 'just now';
  for (const [ms, unit] of units) {
    if (absolute >= ms) {
      const count = Math.round(absolute / ms);
      relative = `${count} ${unit}${count === 1 ? '' : 's'} ${delta < 0 ? 'ago' : 'from now'}`;
      break;
    }
  }

  return [
    `ISO 8601:    ${date.toISOString()}`,
    `UTC:         ${date.toUTCString()}`,
    `Local:       ${date.toString()}`,
    `Unix (s):    ${Math.floor(date.getTime() / 1000)}`,
    `Unix (ms):   ${date.getTime()}`,
    `Day:         ${date.toLocaleDateString('en', { weekday: 'long', timeZone: 'UTC' })}`,
    `Relative:    ${relative}`,
  ].join('\n');
}

export const dateTimeOperations: Operation[] = [
  {
    id: 'from-unix-timestamp',
    name: 'From UNIX Timestamp',
    category: 'Date / Time',
    description: 'Turns a Unix timestamp into every common date representation.',
    aliases: ['epoch to date', 'unix to date', 'timestamp'],
    args: [
      { name: 'Units', type: 'option', value: 'Auto', options: ['Auto', 'Seconds', 'Milliseconds', 'Microseconds'] },
    ],
    run: (input, args) => {
      const value = Number(input.trim());
      if (!Number.isFinite(value)) throw new OperationError('Not a number.');

      const units = String(arg(args, 'Units', 'Auto'));
      const digits = input.trim().replace(/\D/g, '').length;
      // Digit count is the only reliable signal when the unit is not stated.
      const ms =
        units === 'Seconds' || (units === 'Auto' && digits <= 10)
          ? value * 1000
          : units === 'Microseconds' || (units === 'Auto' && digits >= 16)
            ? value / 1000
            : value;

      return describe(requireDate(ms, 'That timestamp'));
    },
    detection: {
      formatName: 'Unix timestamp',
      pattern: /^1[0-9]{9}$|^1[0-9]{12}$/,
      minLength: 10,
    },
  },
  {
    id: 'to-unix-timestamp',
    name: 'To UNIX Timestamp',
    category: 'Date / Time',
    description: 'Parses a date and returns its Unix timestamp.',
    aliases: ['date to epoch', 'date to unix'],
    args: [{ name: 'Units', type: 'option', value: 'Seconds', options: ['Seconds', 'Milliseconds'] }],
    run: (input, args) => {
      const date = new Date(input.trim());
      if (Number.isNaN(date.getTime())) {
        throw new OperationError('Could not parse that as a date. ISO 8601 always works.');
      }
      return String(
        arg(args, 'Units', 'Seconds') === 'Seconds'
          ? Math.floor(date.getTime() / 1000)
          : date.getTime(),
      );
    },
  },
  {
    id: 'parse-datetime',
    name: 'Parse date and time',
    category: 'Date / Time',
    description: 'Reads a date in almost any format and shows it in all the others.',
    aliases: ['convert date', 'date format', 'translate datetime'],
    args: [],
    run: (input) => {
      const text = input.trim();
      const date = new Date(text);
      if (Number.isNaN(date.getTime())) {
        throw new OperationError('Could not parse that as a date.');
      }
      return describe(date);
    },
  },
  {
    id: 'from-filetime',
    name: 'From Windows FILETIME',
    category: 'Date / Time',
    description: 'Converts a Windows FILETIME value, as found in registry hives and event logs.',
    aliases: ['filetime', 'windows timestamp', 'ntfs time'],
    args: [],
    run: (input) => {
      const text = input.trim().replace(/^0x/i, '');
      let ticks: bigint;
      try {
        ticks = /^[0-9a-f]+$/i.test(text) && !/^\d+$/.test(text) ? BigInt(`0x${text}`) : BigInt(text);
      } catch {
        throw new OperationError('Not a FILETIME value.');
      }
      if (ticks <= 0n) throw new OperationError('A FILETIME must be positive.');

      const seconds = ticks / TICKS_PER_SECOND - FILETIME_EPOCH_DIFF;
      return describe(requireDate(Number(seconds) * 1000, 'That FILETIME'));
    },
  },
  {
    id: 'to-filetime',
    name: 'To Windows FILETIME',
    category: 'Date / Time',
    description: 'Converts a date into a Windows FILETIME value.',
    aliases: ['date to filetime'],
    args: [{ name: 'Output', type: 'option', value: 'Decimal', options: ['Decimal', 'Hexadecimal'] }],
    run: (input, args) => {
      const date = new Date(input.trim());
      if (Number.isNaN(date.getTime())) throw new OperationError('Could not parse that as a date.');

      const ticks =
        (BigInt(Math.floor(date.getTime() / 1000)) + FILETIME_EPOCH_DIFF) * TICKS_PER_SECOND;
      return arg(args, 'Output', 'Decimal') === 'Hexadecimal'
        ? `0x${ticks.toString(16)}`
        : ticks.toString();
    },
  },
  {
    id: 'now',
    name: 'Current time',
    category: 'Date / Time',
    description: 'Shows the current time in every common representation.',
    aliases: ['now', 'today', 'current timestamp'],
    args: [],
    run: () => describe(new Date()),
  },
];
