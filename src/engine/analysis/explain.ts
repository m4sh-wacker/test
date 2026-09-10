import type { Analysis, Indicator, IndicatorKind, Severity } from './types';
import type { Layer } from '../types';
import { summariseChain } from '../detection/chain';

/**
 * What this payload is, in a sentence.
 *
 * Everything needed to say it was already on screen and none of it was said:
 * the chain is in one band, the indicators in a list, the findings in another,
 * and joining them up was left to the reader. That join is the product's whole
 * promise — "I give it data and it tells me what I am holding" — so it is worth
 * doing in words rather than making somebody assemble it from four panels.
 *
 * Nothing here is inferred. Every clause is something the engine already
 * decided, restated; if there is nothing to say, this says nothing rather than
 * padding. A tool that manufactures a confident sentence out of thin evidence
 * is worse than one that stays quiet.
 */

export interface Explanation {
  /** 'Three layers of Base64 around a JSON object'. Always present. */
  headline: string;
  /** Further sentences, each complete and each independently true. */
  details: string[];
  /** The finding that most deserves to be read, if any. */
  warning?: { severity: Severity; title: string };
  /** The whole thing as plain prose, for copying into a ticket. */
  text: string;
}

const NUMBERS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six',
  'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
];

function count(n: number): string {
  return NUMBERS[n] ?? String(n);
}

/**
 * Names whose article the spelling rule gets wrong.
 *
 * An initialism takes the article of the *letter's* name, not the letter: MD5
 * is "em-dee-five", so it is an MD5. It runs the other way too — UUID is
 * "you-you-eye-dee" and SHA is "shah", so both take 'a' despite starting with a
 * vowel or being all capitals. There is no rule for this that does not need a
 * pronunciation dictionary, so the ones that actually come out of this engine
 * are listed and everything else falls back to spelling.
 */
const ARTICLES: Record<string, string> = {
  MD2: 'an', MD4: 'an', MD5: 'an',
  NTLM: 'an', LM: 'an', HMAC: 'an', RSA: 'an', XML: 'an', HTML: 'an',
  SHA: 'a', UUID: 'a', URL: 'a', URI: 'a',
};

/** 'a' or 'an', decided by how the word is said rather than how it is spelt. */
function article(word: string): string {
  const head = word.split(/[\s-]/)[0] ?? word;
  const known = ARTICLES[head.toUpperCase()];
  if (known) return known;
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

/**
 * Format names are not noun phrases.
 *
 * "around a JSON" is what you get from pasting an identifier into a sentence.
 * These are the ones that read badly on their own; everything else falls back
 * to the name with an article, which is right for 'a JWT' and 'a PNG image'.
 */
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

/**
 * The wrapping, described.
 *
 * `Base64 x3 then JSON` is precise and reads like a machine. "Three layers of
 * Base64 around a JSON object" is the same fact in the register a person would
 * use to describe it to a colleague.
 *
 * The innermost run is the content when there is more than one; when there is
 * only one, the content is whatever the chain ended on — an identified digest,
 * or plain text.
 */
function describeWrapping(root: Layer, ending: EndingInfo | null): string | null {
  const runs = summariseChain(root);
  const identified = ending?.identification?.matches[0]?.name;

  if (runs.length === 0) {
    // Nothing was unwrapped. If the engine still named it, that is the answer.
    // The one-way note in the details already says the rest; a trailing
    // "with nothing wrapped around it" only pads it out.
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

/** Kinds worth naming in a sentence, most interesting first. */
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

/**
 * How the chain ended, but only when the ending is itself the news.
 *
 * The identification is in the headline now, so this is left with the one thing
 * the headline cannot carry: whether what you are reading is the bottom or
 * merely as far as it got. That difference is the difference between a finished
 * answer and a partial one.
 */
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

  // Nothing decoded, nothing named, nothing found, nothing flagged.
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
