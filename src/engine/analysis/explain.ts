import type { Analysis, Indicator, IndicatorKind, Severity } from './types';
import type { Layer } from '../types';
import { summariseChain } from '../detection/chain';


export interface Explanation {
  headline: string;
  details: string[];
  warning?: { severity: Severity; title: string };
  text: string;
}

const NUMBERS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six',
  'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
];

function count(n: number): string {
  return NUMBERS[n] ?? String(n);
}

const ARTICLES: Record<string, string> = {
  MD2: 'an', MD4: 'an', MD5: 'an',
  NTLM: 'an', LM: 'an', HMAC: 'an', RSA: 'an', XML: 'an', HTML: 'an',
  SHA: 'a', UUID: 'a', URL: 'a', URI: 'a',
};

function article(word: string): string {
  const head = word.split(/[\s-]/)[0] ?? word;
  const known = ARTICLES[head.toUpperCase()];
  if (known) return known;
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

const NOUNS: Record<string, string> = {
  JSON: 'a JSON object',
  XML: 'an XML document',
  YAML: 'a YAML document',
  CSV: 'a CSV table',
  HTML: 'an HTML fragment',
  'Plain text': 'plain text',
};

function asNoun(format: string): string {
  return NOUNS[format] ?? `${article(format)} ${format}`;
}

function describeWrapping(root: Layer, ending: EndingInfo | null): string | null {
  const runs = summariseChain(root);
  const identified = ending?.identification?.matches[0]?.name;

  if (runs.length === 0) {
    return identified ? capitalise(asNoun(identified)) : null;
  }

  const wrappers = runs.length > 1 ? runs.slice(0, -1) : runs;
  const innermost = runs.length > 1 ? runs[runs.length - 1]! : null;

  const layers = wrappers.map((run) =>
    run.count > 1 ? `${count(run.count)} layers of ${run.format}` : `one layer of ${run.format}`,
  );

  const content = innermost
    ? innermost.count > 1
      ? `${count(innermost.count)} layers of ${innermost.format}`
      : asNoun(innermost.format)
    : identified
      ? asNoun(identified)
      : ending?.complete
        ? 'plain text'
        : null;

  const wrapping = layers.join(', then ');
  return content ? `${wrapping} around ${content}` : wrapping;
}

const NOTABLE: IndicatorKind[] = [
  'url', 'ipv4', 'ipv6', 'domain', 'command', 'crypto-key', 'wallet', 'cve', 'email',
];

const KIND_WORDS: Record<IndicatorKind, [string, string]> = {
  url: ['a URL', 'URLs'],
  domain: ['a hostname', 'hostnames'],
  ipv4: ['an IP address', 'IP addresses'],
  ipv6: ['an IPv6 address', 'IPv6 addresses'],
  email: ['an email address', 'email addresses'],
  hash: ['a hash', 'hashes'],
  path: ['a file path', 'file paths'],
  registry: ['a registry key', 'registry keys'],
  command: ['a shell command', 'shell commands'],
  'crypto-key': ['a key', 'keys'],
  mac: ['a MAC address', 'MAC addresses'],
  cve: ['a CVE reference', 'CVE references'],
  wallet: ['a wallet address', 'wallet addresses'],
};

function join(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function describeIndicators(indicators: Indicator[]): string | null {
  if (indicators.length === 0) return null;

  const seen = NOTABLE.filter((kind) => indicators.some((i) => i.kind === kind)).slice(0, 3);
  if (seen.length === 0) return null;

  const phrases = seen.map((kind) => {
    const n = indicators.filter((i) => i.kind === kind).length;
    const [one, many] = KIND_WORDS[kind];
    return n > 1 ? `${count(n)} ${many}` : one;
  });

  return `It contains ${join(phrases)}.`;
}

function describeEnding(ending: EndingInfo | null): string | null {
  if (!ending) return null;
  if (!ending.complete) return 'Decoding stopped before it ran out, so there may be more underneath.';
  if (ending.oneWayEnding) return 'That is one-way — there is nothing under it to decode.';
  return null;
}

interface EndingInfo {
  complete: boolean;
  identification?: { matches: Array<{ name: string }> };
  oneWayEnding?: boolean;
}

function lastTerminus(root: Layer): EndingInfo | null {
  let node = root;
  while (node.children.length > 0) node = node.children[0]!;
  const terminus = node.terminus;
  if (!terminus) return null;
  return {
    complete: terminus.complete,
    ...(terminus.identification ? { identification: terminus.identification } : {}),
    oneWayEnding: terminus.identification?.oneWay ?? false,
  };
}

export function explain(root: Layer, analysis: Analysis | null): Explanation | null {
  const ending = lastTerminus(root);
  const wrapping = describeWrapping(root, ending);
  const indicators = analysis ? describeIndicators(analysis.indicators) : null;
  const closing = describeEnding(ending);
  const worst = analysis?.findings[0];

  if (!wrapping && !indicators && !worst) return null;

  const headline = wrapping
    ? `${capitalise(wrapping)}.`
    : 'Plain content, with nothing wrapped around it.';
  const details = [indicators, closing].filter((part): part is string => part !== null);

  const warning = worst ? { severity: worst.severity, title: worst.title } : undefined;
  const warningText = worst ? `Flagged: ${worst.title} (${worst.severity}).` : null;

  return {
    headline,
    details,
    ...(warning ? { warning } : {}),
    text: [headline, ...details, warningText].filter(Boolean).join(' '),
  };
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
