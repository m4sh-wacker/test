import { OperationError } from '../types';
import { arg, type Operation } from './types';

/**
 * Date and time formatting, on the platform's own time-zone database.
 *
 * `Intl` already ships the IANA zones and their historical offsets, so there is
 * no need for a bundled copy of the tz database — the same reason the character
 * sets come from `TextDecoder`. What `Intl` will not do is *parse* a string in a
 * named zone, so that part is done here: read the fields, guess the instant,
 * then correct the guess by the offset the zone actually had at that instant.
 */

/** The zones this runtime knows, or just UTC if it was built without them. */
function zoneNames(): string[] {
  try {
    const supported = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf?.('timeZone');
    if (supported && supported.length > 0) return ['UTC', ...supported];
  } catch {
    /* an engine without the full zone set */
  }
  return ['UTC'];
}

const ZONES = zoneNames();

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const BUILT_IN_FORMATS = [
  'DD/MM/YYYY HH:mm:ss',
  'MM/DD/YYYY HH:mm:ss',
  'YYYY-MM-DD HH:mm:ss',
  'YYYY-MM-DDTHH:mm:ssZ',
  'dddd D MMMM YYYY HH:mm:ss',
  'ddd, DD MMM YYYY HH:mm:ss',
  'X',
  'x',
];

interface Fields {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  /** Minutes east of UTC when the input itself carried an offset. */
  offset: number | null;
  meridiem: 'am' | 'pm' | null;
}

/**
 * Tokens, longest first, so `YYYY` is never read as `YY` followed by `YY`.
 *
 * Each carries the pattern that matches it and how to store what it matched;
 * the same table drives both parsing and formatting.
 */
const TOKENS: Array<{
  token: string;
  pattern: string;
  read?: (fields: Fields, text: string) => void;
  write: (date: Parts, zone: string) => string;
}> = [
  {
    token: 'YYYY',
    pattern: '(\\d{4})',
    read: (f, t) => (f.year = Number(t)),
    write: (d) => String(d.year).padStart(4, '0'),
  },
  {
    token: 'YY',
    pattern: '(\\d{2})',
    // A two-digit year of 70 or more is the twentieth century, as POSIX has it.
    read: (f, t) => (f.year = Number(t) >= 70 ? 1900 + Number(t) : 2000 + Number(t)),
    write: (d) => String(d.year % 100).padStart(2, '0'),
  },
  {
    token: 'MMMM',
    pattern: '([A-Za-z]+)',
    read: (f, t) => (f.month = monthIndex(t)),
    write: (d) => MONTHS[d.month - 1] as string,
  },
  {
    token: 'MMM',
    pattern: '([A-Za-z]{3})',
    read: (f, t) => (f.month = monthIndex(t)),
    write: (d) => (MONTHS[d.month - 1] as string).slice(0, 3),
  },
  {
    token: 'MM',
    pattern: '(\\d{2})',
    read: (f, t) => (f.month = Number(t)),
    write: (d) => String(d.month).padStart(2, '0'),
  },
  {
    token: 'M',
    pattern: '(\\d{1,2})',
    read: (f, t) => (f.month = Number(t)),
    write: (d) => String(d.month),
  },
  {
    token: 'dddd',
    pattern: '([A-Za-z]+)',
    write: (d) => DAYS[d.weekday] as string,
  },
  {
    token: 'ddd',
    pattern: '([A-Za-z]{3})',
    write: (d) => (DAYS[d.weekday] as string).slice(0, 3),
  },
  {
    token: 'Do',
    pattern: '(\\d{1,2})(?:st|nd|rd|th)',
    read: (f, t) => (f.day = Number(t)),
    write: (d) => `${d.day}${ordinal(d.day)}`,
  },
  {
    token: 'DD',
    pattern: '(\\d{2})',
    read: (f, t) => (f.day = Number(t)),
    write: (d) => String(d.day).padStart(2, '0'),
  },
  {
    token: 'D',
    pattern: '(\\d{1,2})',
    read: (f, t) => (f.day = Number(t)),
    write: (d) => String(d.day),
  },
  {
    token: 'HH',
    pattern: '(\\d{2})',
    read: (f, t) => (f.hour = Number(t)),
    write: (d) => String(d.hour).padStart(2, '0'),
  },
  {
    token: 'H',
    pattern: '(\\d{1,2})',
    read: (f, t) => (f.hour = Number(t)),
    write: (d) => String(d.hour),
  },
  {
    token: 'hh',
    pattern: '(\\d{2})',
    read: (f, t) => (f.hour = Number(t)),
    write: (d) => String(((d.hour + 11) % 12) + 1).padStart(2, '0'),
  },
  {
    token: 'h',
    pattern: '(\\d{1,2})',
    read: (f, t) => (f.hour = Number(t)),
    write: (d) => String(((d.hour + 11) % 12) + 1),
  },
  {
    token: 'mm',
    pattern: '(\\d{2})',
    read: (f, t) => (f.minute = Number(t)),
    write: (d) => String(d.minute).padStart(2, '0'),
  },
  {
    token: 'm',
    pattern: '(\\d{1,2})',
    read: (f, t) => (f.minute = Number(t)),
    write: (d) => String(d.minute),
  },
  {
    token: 'ss',
    pattern: '(\\d{2})',
    read: (f, t) => (f.second = Number(t)),
    write: (d) => String(d.second).padStart(2, '0'),
  },
  {
    token: 's',
    pattern: '(\\d{1,2})',
    read: (f, t) => (f.second = Number(t)),
    write: (d) => String(d.second),
  },
  {
    token: 'SSS',
    pattern: '(\\d{3})',
    read: (f, t) => (f.millisecond = Number(t)),
    write: (d) => String(d.millisecond).padStart(3, '0'),
  },
  {
    token: 'A',
    pattern: '([AP]M)',
    read: (f, t) => (f.meridiem = t.toLowerCase() === 'pm' ? 'pm' : 'am'),
    write: (d) => (d.hour < 12 ? 'AM' : 'PM'),
  },
  {
    token: 'a',
    pattern: '([ap]m)',
    read: (f, t) => (f.meridiem = t.toLowerCase() === 'pm' ? 'pm' : 'am'),
    write: (d) => (d.hour < 12 ? 'am' : 'pm'),
  },
  {
    token: 'ZZ',
    pattern: '([+-]\\d{2}:?\\d{2}|Z)',
    read: (f, t) => (f.offset = readOffset(t)),
    write: (d) => offsetText(d.offset, false),
  },
  {
    token: 'Z',
    pattern: '([+-]\\d{2}:?\\d{2}|Z)',
    read: (f, t) => (f.offset = readOffset(t)),
    write: (d) => offsetText(d.offset, true),
  },
  {
    token: 'z',
    pattern: '([A-Za-z/_+-]+)',
    // Passed the abbreviation rather than the zone id, because 'EST' is what a
    // reader expects to see and 'US/Eastern' is what the argument holds.
    write: (_d, abbreviation) => abbreviation,
  },
  {
    token: 'X',
    pattern: '(-?\\d+)',
    read: (f, t) => Object.assign(f, fieldsFromInstant(Number(t) * 1000)),
    write: (d) => String(Math.floor(d.instant / 1000)),
  },
  {
    token: 'x',
    pattern: '(-?\\d+)',
    read: (f, t) => Object.assign(f, fieldsFromInstant(Number(t))),
    write: (d) => String(d.instant),
  },
];

interface Parts {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  offset: number;
  instant: number;
}

function ordinal(day: number): string {
  if (day % 100 >= 11 && day % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][day % 10] ?? 'th';
}

function monthIndex(name: string): number {
  const found = MONTHS.findIndex((month) => month.toLowerCase().startsWith(name.toLowerCase().slice(0, 3)));
  if (found < 0) throw new OperationError(`'${name}' is not a month.`);
  return found + 1;
}

function readOffset(text: string): number {
  if (text === 'Z') return 0;
  const match = /^([+-])(\d{2}):?(\d{2})$/.exec(text);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === '-' ? -minutes : minutes;
}

function offsetText(minutes: number, colon: boolean): string {
  const sign = minutes < 0 ? '-' : '+';
  const absolute = Math.abs(minutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const rest = String(absolute % 60).padStart(2, '0');
  return `${sign}${hours}${colon ? ':' : ''}${rest}`;
}

function fieldsFromInstant(instant: number): Partial<Fields> {
  const date = new Date(instant);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    millisecond: date.getUTCMilliseconds(),
    offset: 0,
  };
}

/** Minutes east of UTC that a zone was using at a given instant. */
function zoneOffset(zone: string, instant: number): number {
  if (zone === 'UTC') return 0;
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(new Date(instant))) parts[part.type] = part.value;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUtc - Math.floor(instant / 1000) * 1000) / 60000);
}

function buildParser(format: string): { regex: RegExp; readers: Array<(f: Fields, t: string) => void> } {
  const readers: Array<(f: Fields, t: string) => void> = [];
  let pattern = '';

  for (let i = 0; i < format.length; ) {
    if (format[i] === '[') {
      // Square brackets quote literal text, as they do in moment.
      const close = format.indexOf(']', i);
      const literal = format.slice(i + 1, close < 0 ? format.length : close);
      pattern += literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      i = close < 0 ? format.length : close + 1;
      continue;
    }
    const token = TOKENS.find((candidate) => format.startsWith(candidate.token, i));
    if (token) {
      pattern += token.pattern;
      readers.push(token.read ?? (() => undefined));
      i += token.token.length;
      continue;
    }
    pattern += (format[i] as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    i++;
  }
  return { regex: new RegExp(`^\\s*${pattern}\\s*$`), readers };
}

function parseDateTime(input: string, format: string, zone: string): number {
  const { regex, readers } = buildParser(format);
  const match = regex.exec(input);
  if (!match) throw new OperationError(`'${input.trim()}' does not match the format '${format}'.`);

  const fields: Fields = {
    year: 1970,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
    offset: null,
    meridiem: null,
  };
  readers.forEach((read, i) => read(fields, match[i + 1] ?? ''));

  if (fields.meridiem === 'pm' && fields.hour < 12) fields.hour += 12;
  if (fields.meridiem === 'am' && fields.hour === 12) fields.hour = 0;

  const naive = Date.UTC(
    fields.year,
    fields.month - 1,
    fields.day,
    fields.hour,
    fields.minute,
    fields.second,
    fields.millisecond,
  );
  if (Number.isNaN(naive)) throw new OperationError('Those fields are not a real date.');
  if (fields.offset !== null) return naive - fields.offset * 60000;

  // The zone's offset depends on the instant, and the instant depends on the
  // offset. One correction settles it except within the hour a clock changes,
  // where a second pass picks the reading that is actually consistent.
  const first = naive - zoneOffset(zone, naive) * 60000;
  const second = naive - zoneOffset(zone, first) * 60000;
  return second;
}

/**
 * The short name a zone goes by at a given instant — EST, BST, GMT+4:30.
 *
 * Asked for in en-US because that is the locale whose data carries the North
 * American abbreviations; other locales render the same zones as GMT offsets.
 */
function zoneAbbreviation(zone: string, instant: number): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'short',
    }).formatToParts(new Date(instant));
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? zone;
  } catch {
    return zone;
  }
}

function partsFor(instant: number, zone: string): Parts {
  const offset = zoneOffset(zone, instant);
  const shifted = new Date(instant + offset * 60000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    millisecond: shifted.getUTCMilliseconds(),
    offset,
    instant,
  };
}

function formatDateTime(instant: number, format: string, zone: string): string {
  const parts = partsFor(instant, zone);
  const abbreviation = zoneAbbreviation(zone, instant);
  let out = '';

  for (let i = 0; i < format.length; ) {
    if (format[i] === '[') {
      const close = format.indexOf(']', i);
      out += format.slice(i + 1, close < 0 ? format.length : close);
      i = close < 0 ? format.length : close + 1;
      continue;
    }
    const token = TOKENS.find((candidate) => format.startsWith(candidate.token, i));
    if (token) {
      out += token.write(parts, abbreviation);
      i += token.token.length;
      continue;
    }
    out += format[i];
    i++;
  }
  return out;
}

export const dateTimeFormatOperations: Operation[] = [
  {
    id: 'translate-datetime-format',
    name: 'Translate DateTime Format',
    category: 'Date / Time',
    description: 'Reads a date in one format and time zone and writes it in another.',
    aliases: ['date format', 'strftime', 'timezone convert'],
    args: [
      {
        name: 'Built in formats',
        type: 'option',
        value: 'DD/MM/YYYY HH:mm:ss',
        options: BUILT_IN_FORMATS,
      },
      { name: 'Input format string', type: 'string', value: 'DD/MM/YYYY HH:mm:ss' },
      { name: 'Input timezone', type: 'option', value: 'UTC', options: ZONES },
      { name: 'Output format string', type: 'string', value: 'dddd Do MMMM YYYY HH:mm:ss Z z' },
      { name: 'Output timezone', type: 'option', value: 'UTC', options: ZONES },
    ],
    run: (input, args) => {
      const inputFormat = String(arg(args, 'Input format string', 'DD/MM/YYYY HH:mm:ss'));
      const outputFormat = String(arg(args, 'Output format string', 'YYYY-MM-DD HH:mm:ss'));
      const instant = parseDateTime(input, inputFormat, String(arg(args, 'Input timezone', 'UTC')));
      return formatDateTime(instant, outputFormat, String(arg(args, 'Output timezone', 'UTC')));
    },
  },
  {
    id: 'datetime-delta',
    name: 'DateTime Delta',
    category: 'Date / Time',
    description: 'Adds or subtracts an interval from a date and writes it back.',
    aliases: ['add time', 'subtract time', 'date maths'],
    args: [
      {
        name: 'Built in formats',
        type: 'option',
        value: 'DD/MM/YYYY HH:mm:ss',
        options: BUILT_IN_FORMATS,
      },
      { name: 'Input format string', type: 'string', value: 'DD/MM/YYYY HH:mm:ss' },
      { name: 'Time operation', type: 'option', value: 'Add', options: ['Add', 'Subtract'] },
      { name: 'Days', type: 'number', value: 0 },
      { name: 'Hours', type: 'number', value: 0 },
      { name: 'Minutes', type: 'number', value: 0 },
      { name: 'Seconds', type: 'number', value: 0 },
    ],
    run: (input, args) => {
      const format = String(arg(args, 'Input format string', 'DD/MM/YYYY HH:mm:ss'));
      const instant = parseDateTime(input, format, 'UTC');
      const seconds =
        Number(arg(args, 'Days', 0)) * 86400 +
        Number(arg(args, 'Hours', 0)) * 3600 +
        Number(arg(args, 'Minutes', 0)) * 60 +
        Number(arg(args, 'Seconds', 0));
      const sign = String(arg(args, 'Time operation', 'Add')) === 'Subtract' ? -1 : 1;
      return formatDateTime(instant + sign * seconds * 1000, format, 'UTC');
    },
  },
];
