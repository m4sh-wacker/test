/**
 * The published Base64 alphabets, by the names they are published under.
 *
 * A raw alphabet in a settings box tells you nothing: `./0-9A-Za-z` is either
 * UNIX crypt or a typo, and there is no way to tell from the characters. The
 * name is the part a person recognises, so the control shows both.
 *
 * Order is by how often you meet them, not alphabetical: the two RFC 4648
 * variants account for almost everything, and the rest are here because when
 * you do need one, nothing else will do.
 */

export interface NamedAlphabet {
  label: string;
  spec: string;
}

export const BASE64_ALPHABETS: NamedAlphabet[] = [
  { label: 'Standard (RFC 4648)', spec: 'A-Za-z0-9+/=' },
  { label: 'URL safe (RFC 4648 §5)', spec: 'A-Za-z0-9-_' },
  // The dash is escaped in both of these: it is a *value* in the alphabet, not
  // a range. Unescaped, `+-=` reads as the nineteen characters from '+' to '='
  // and the alphabet comes out 81 long instead of 65.
  { label: 'Filename safe', spec: 'A-Za-z0-9+\\-=' },
  { label: 'itoa64', spec: './0-9A-Za-z=' },
  { label: 'XML', spec: 'A-Za-z0-9_.' },
  { label: 'y64', spec: 'A-Za-z0-9._-' },
  { label: 'z64', spec: '0-9a-zA-Z+/=' },
  { label: 'Radix-64 (RFC 4880)', spec: '0-9A-Za-z+/=' },
  { label: 'Uuencoding', spec: '[space]-_' },
  { label: 'Xxencoding', spec: '+\\-0-9A-Za-z' },
  { label: 'BinHex', spec: '!-,-0-689@A-NP-VX-Z[`a-fh-mp-r' },
  { label: 'ROT13', spec: 'N-ZA-Mn-za-m0-9+/=' },
  { label: 'UNIX crypt', spec: './0-9A-Za-z' },
];

/**
 * Base32 has fewer variants and they matter more, because the two in common use
 * sort differently and silently produce different bytes for the same input.
 */
export const BASE32_ALPHABETS: NamedAlphabet[] = [
  { label: 'Standard (RFC 4648)', spec: 'A-Z2-7=' },
  { label: 'Extended hex (RFC 4648 §7)', spec: '0-9A-V=' },
  { label: 'z-base-32', spec: 'ybndrfg8ejkmcpqxot1uwisza345h769' },
  { label: 'Crockford', spec: '0-9A-HJKMNP-TV-Z' },
];

/** The dropdown entries: the value is the spec, the label explains it. */
export function optionsFor(alphabets: NamedAlphabet[]): {
  options: string[];
  optionLabels: Record<string, string>;
} {
  const options = alphabets.map((a) => a.spec);
  const optionLabels: Record<string, string> = {};
  for (const { label, spec } of alphabets) optionLabels[spec] = label;
  return { options, optionLabels };
}
