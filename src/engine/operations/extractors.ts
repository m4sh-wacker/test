import { arg, type Operation } from './types';

// Deliberately permissive: an extractor that misses a real indicator is worse
// than one that occasionally includes something uninteresting, because the
// analyst can see and discard the extra.
const URL_RE = /\b(?:https?|ftp):\/\/[^\s<>"'`]+/gi;
const IPV4_RE = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const DOMAIN_RE = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi;
const HASH_RE = /\b[0-9a-f]{32}\b|\b[0-9a-f]{40}\b|\b[0-9a-f]{64}\b/gi;

function collect(input: string, pattern: RegExp, unique: boolean): string {
  const matches = input.match(pattern) ?? [];
  const result = unique ? [...new Set(matches)] : matches;
  return result.length ? result.join('\n') : '(nothing found)';
}

export const extractorOperations: Operation[] = [
  {
    id: 'extract-urls',
    name: 'Extract URLs',
    category: 'Extractors',
    description: 'Finds every http, https, and ftp URL in the input.',
    aliases: ['find urls', 'grep urls', 'links'],
    args: [{ name: 'Unique', type: 'boolean', value: true }],
    run: (input, args) => collect(input, URL_RE, arg(args, 'Unique', true)),
  },
  {
    id: 'extract-ips',
    name: 'Extract IP addresses',
    category: 'Extractors',
    description: 'Finds IPv4 addresses in the input.',
    aliases: ['find ips', 'grep ip', 'ipv4'],
    args: [{ name: 'Unique', type: 'boolean', value: true }],
    run: (input, args) => collect(input, IPV4_RE, arg(args, 'Unique', true)),
  },
  {
    id: 'extract-emails',
    name: 'Extract email addresses',
    category: 'Extractors',
    description: 'Finds email addresses in the input.',
    aliases: ['find emails', 'grep email'],
    args: [{ name: 'Unique', type: 'boolean', value: true }],
    run: (input, args) => collect(input, EMAIL_RE, arg(args, 'Unique', true)),
  },
  {
    id: 'extract-domains',
    name: 'Extract domains',
    category: 'Extractors',
    description: 'Finds domain names in the input.',
    aliases: ['find domains', 'hostnames'],
    args: [{ name: 'Unique', type: 'boolean', value: true }],
    run: (input, args) => collect(input, DOMAIN_RE, arg(args, 'Unique', true)),
  },
  {
    id: 'extract-hashes',
    name: 'Extract hashes',
    category: 'Extractors',
    description: 'Finds MD5, SHA-1 and SHA-256 digests in the input.',
    aliases: ['find hashes', 'grep hash'],
    args: [{ name: 'Unique', type: 'boolean', value: true }],
    run: (input, args) => collect(input, HASH_RE, arg(args, 'Unique', true)),
  },
  {
    id: 'defang',
    name: 'Defang IOCs',
    category: 'Extractors',
    description: 'Makes URLs and IP addresses unclickable so they can be shared safely.',
    aliases: ['defang url', 'neuter', 'make safe'],
    args: [],
    run: (input) =>
      input
        .replace(/\./g, '[.]')
        .replace(/:\/\//g, '[://]')
        .replace(/^http/gim, 'hxxp')
        .replace(/@/g, '[at]'),
  },
  {
    id: 'refang',
    name: 'Refang IOCs',
    category: 'Extractors',
    description: 'Reverses defanging, restoring real URLs and addresses.',
    aliases: ['fang', 'undefang', 'restore url'],
    args: [],
    run: (input) =>
      input
        .replace(/\[\.\]|\(\.\)|\{\.\}/g, '.')
        .replace(/\[:\/\/\]|\[\/\/\]/g, '://')
        .replace(/\bhxxp/gi, 'http')
        .replace(/\[at\]|\(at\)/gi, '@')
        .replace(/\[:\]/g, ':'),
    detection: {
      formatName: 'Defanged IOC',
      pattern: /hxxp|\[\.\]|\[:\/\/\]|\[at\]/i,
      minLength: 6,
    },
  },
  {
    id: 'strings',
    name: 'Extract strings',
    category: 'Forensics',
    description: 'Pulls readable text out of binary data, like the strings utility.',
    aliases: ['strings', 'printable'],
    args: [{ name: 'Minimum length', type: 'number', value: 4 }],
    run: (input, args) => {
      const min = Math.max(1, Number(arg(args, 'Minimum length', 4)));
      const found = input.match(new RegExp(`[\\x20-\\x7e]{${min},}`, 'g')) ?? [];
      return found.length ? found.join('\n') : '(no printable runs found)';
    },
  },
];
