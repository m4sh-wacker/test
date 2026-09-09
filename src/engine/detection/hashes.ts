/**
 * Hash and password-digest identification.
 *
 * This exists because of a specific failure: paste an MD5 into a decoding tool
 * and it tells you nothing useful, or worse, hex-decodes it into sixteen bytes
 * of noise. The honest answer is "this is a digest, here is what kind, and
 * there is nothing to decode" — and saying so is more useful than any
 * transformation.
 *
 * Identification is ranked, never singular. A bare 32-character hex string is
 * genuinely ambiguous between MD5, NTLM, MD4 and several others; a tool that
 * picks one and states it confidently is lying about what it knows. Prefixed
 * formats are a different matter — `$2b$` is bcrypt and nothing else.
 */

import type { HashIdentification, HashMatch } from '../types';

export type { HashIdentification, HashMatch };

interface PrefixRule {
  test: RegExp;
  name: string;
  context: string;
  confidence: number;
}

/**
 * Modular Crypt Format and friends. These carry their own identifier, so a
 * match is close to proof rather than a guess.
 */
const PREFIXED: PrefixRule[] = [
  { test: /^\$2[abxy]?\$\d{2}\$[./A-Za-z0-9]{53}$/, name: 'bcrypt', context: 'Unix password hashing, and the default in many web frameworks', confidence: 0.99 },
  { test: /^\$argon2(id|i|d)\$/, name: 'Argon2', context: 'Modern password hashing; winner of the Password Hashing Competition', confidence: 0.99 },
  { test: /^\$scrypt\$|^\$7\$/, name: 'scrypt', context: 'Memory-hard password hashing', confidence: 0.98 },
  { test: /^\$y\$/, name: 'yescrypt', context: 'Default on recent Debian and Fedora systems', confidence: 0.97 },
  { test: /^\$6\$/, name: 'SHA-512 crypt', context: 'Linux /etc/shadow', confidence: 0.98 },
  { test: /^\$5\$/, name: 'SHA-256 crypt', context: 'Linux /etc/shadow', confidence: 0.98 },
  { test: /^\$1\$/, name: 'MD5 crypt', context: 'Legacy Unix /etc/shadow, and Cisco type 5', confidence: 0.98 },
  { test: /^\$apr1\$/, name: 'Apache MD5 (APR1)', context: 'Apache .htpasswd files', confidence: 0.98 },
  { test: /^\$sha1\$\d+\$/, name: 'SHA-1 crypt', context: 'NetBSD', confidence: 0.96 },
  { test: /^\$md5[,$]/, name: 'Sun MD5 crypt', context: 'Solaris', confidence: 0.95 },
  { test: /^\$P\$[./A-Za-z0-9]{31}$/, name: 'phpass (portable)', context: 'WordPress and phpBB3', confidence: 0.97 },
  { test: /^\$H\$[./A-Za-z0-9]{31}$/, name: 'phpass (phpBB3)', context: 'phpBB3', confidence: 0.97 },
  { test: /^\$S\$[./A-Za-z0-9]{52}$/, name: 'Drupal 7 (SHA-512)', context: 'Drupal 7', confidence: 0.97 },
  { test: /^\$pbkdf2(-sha(1|256|512))?\$/, name: 'PBKDF2 (passlib)', context: 'Python passlib', confidence: 0.97 },
  { test: /^pbkdf2_sha(1|256|512)\$\d+\$/, name: 'PBKDF2 (Django)', context: 'Django user accounts', confidence: 0.98 },
  { test: /^\{SSHA\}/, name: 'Salted SHA-1 (LDAP)', context: 'OpenLDAP', confidence: 0.98 },
  { test: /^\{SHA\}/, name: 'SHA-1 (LDAP)', context: 'OpenLDAP; unsalted, so trivially cracked', confidence: 0.98 },
  { test: /^\{SMD5\}/, name: 'Salted MD5 (LDAP)', context: 'OpenLDAP', confidence: 0.98 },
  { test: /^\{MD5\}/, name: 'MD5 (LDAP)', context: 'OpenLDAP; unsalted', confidence: 0.98 },
  { test: /^\{CRYPT\}/, name: 'crypt (LDAP)', context: 'OpenLDAP wrapping a Unix crypt hash', confidence: 0.96 },
  { test: /^\*[0-9A-F]{40}$/i, name: 'MySQL 4.1+ (SHA-1 twice)', context: 'MySQL user table', confidence: 0.97 },
  { test: /^0x0100[0-9A-F]{48}$/i, name: 'MSSQL 2005+', context: 'Microsoft SQL Server', confidence: 0.96 },
  { test: /^0x0200[0-9A-F]{136}$/i, name: 'MSSQL 2012+', context: 'Microsoft SQL Server', confidence: 0.96 },
  { test: /^\$krb5tgs\$/, name: 'Kerberos TGS-REP', context: 'Kerberoasting output', confidence: 0.99 },
  { test: /^\$krb5asrep\$/, name: 'Kerberos AS-REP', context: 'AS-REP roasting output', confidence: 0.99 },
  { test: /^\$NT\$[0-9a-f]{32}$/i, name: 'NTLM', context: 'Windows account database', confidence: 0.98 },
  { test: /^\$DCC2\$/, name: 'Domain Cached Credentials 2', context: 'Cached Windows domain logons', confidence: 0.98 },
  { test: /^\$ml\$/, name: 'macOS 10.8+ (PBKDF2-SHA512)', context: 'macOS accounts', confidence: 0.97 },
  { test: /^\$sha1\$/, name: 'SHA-1 crypt', context: 'NetBSD', confidence: 0.95 },
  { test: /^\$bf\$|^\$2\$/, name: 'bcrypt (early variant)', context: 'Older OpenBSD', confidence: 0.9 },
];

/**
 * Bare hex digests, keyed by digit count. Order within each list is by how
 * often the format actually turns up, not alphabetically — the first entry is
 * the one to try first, and that is the whole value of this table.
 */
const BY_HEX_LENGTH: Record<number, string[]> = {
  8: ['CRC-32', 'Adler-32', 'FNV-1a (32-bit)'],
  16: ['MySQL 3.2.3', 'CRC-64', 'DES (Unix, truncated)', 'FNV-1a (64-bit)'],
  32: ['MD5', 'NTLM', 'MD4', 'LM', 'RIPEMD-128', 'MD2', 'Haval-128', 'Tiger-128'],
  40: ['SHA-1', 'MySQL 4.1+ (unprefixed)', 'RIPEMD-160', 'Haval-160', 'Tiger-160'],
  48: ['Tiger-192', 'Haval-192', 'SHA-1 (truncated)'],
  56: ['SHA-224', 'SHA3-224', 'Haval-224', 'BLAKE2s-224'],
  64: ['SHA-256', 'SHA3-256', 'BLAKE2s-256', 'Keccak-256', 'RIPEMD-256', 'GOST R 34.11-94', 'Haval-256'],
  80: ['RIPEMD-320'],
  96: ['SHA-384', 'SHA3-384'],
  128: ['SHA-512', 'SHA3-512', 'BLAKE2b-512', 'Whirlpool', 'Keccak-512'],
};

/** Base64-encoded digests, keyed by the number of raw bytes they decode to. */
const BY_BYTE_LENGTH: Record<number, string[]> = {
  16: ['MD5', 'MD4'],
  20: ['SHA-1', 'RIPEMD-160'],
  28: ['SHA-224'],
  32: ['SHA-256', 'BLAKE2s-256'],
  48: ['SHA-384'],
  64: ['SHA-512', 'BLAKE2b-512', 'Whirlpool'],
};

/**
 * The empty-password LM half. Seeing it means the LM hash carries no password,
 * which changes what an analyst does next — worth calling out by name.
 */
const LM_EMPTY = 'aad3b435b51404eeaad3b435b51404ee';

function bareHexMatches(hex: string): HashMatch[] {
  const names = BY_HEX_LENGTH[hex.length];
  if (!names) return [];

  const bits = hex.length * 4;
  const allUpper = hex === hex.toUpperCase() && /[A-F]/.test(hex);

  return names.map((name, index) => {
    // The first candidate at a given length is much more likely than the tail,
    // but none of them is certain — that is the honest shape of this problem.
    let confidence = Math.max(0.2, 0.62 - index * 0.07);
    let reason = `${hex.length} hex digits (${bits} bits)`;

    // Windows tooling prints NTLM in upper case; most other tools print lower.
    // A weak signal, so it moves the ranking rather than deciding it.
    if (hex.length === 32 && allUpper && name === 'NTLM') {
      confidence += 0.12;
      reason += ', upper case as Windows tooling prints NTLM';
    }
    if (hex.length === 32 && allUpper && name === 'MD5') {
      confidence -= 0.06;
    }

    return { name, confidence: Math.min(confidence, 0.75), reason };
  });
}

export function identifyHash(input: string): HashIdentification | null {
  const text = input.trim();
  if (text.length < 8 || /\s/.test(text)) return null;

  const matches: HashMatch[] = [];

  for (const rule of PREFIXED) {
    if (rule.test.test(text)) {
      matches.push({
        name: rule.name,
        confidence: rule.confidence,
        reason: 'Self-identifying prefix',
        context: rule.context,
      });
    }
  }

  if (matches.length > 0) {
    return {
      matches: matches.sort((a, b) => b.confidence - a.confidence).slice(0, 4),
      summary: `${text.length} characters, self-identifying format`,
      oneWay: true,
    };
  }

  // NTLM pairs as LM:NT, which is how secretsdump and similar tools print them.
  const pair = /^([0-9a-f]{32}):([0-9a-f]{32})$/i.exec(text);
  if (pair) {
    const lmEmpty = pair[1]!.toLowerCase() === LM_EMPTY;
    return {
      matches: [
        {
          name: 'LM:NTLM pair',
          confidence: 0.96,
          reason: 'Two 32-digit hex halves separated by a colon',
          context: lmEmpty
            ? 'The LM half is the empty-password constant, so only the NTLM half carries a password'
            : 'The format dumped by secretsdump, pwdump and similar tools',
        },
      ],
      summary: '65 characters, two 128-bit digests',
      oneWay: true,
    };
  }

  const hex = /^(0x)?([0-9a-fA-F]+)$/.exec(text);
  if (hex) {
    const digits = hex[2]!;
    const found = bareHexMatches(digits);
    if (found.length > 0) {
      if (digits.toLowerCase() === LM_EMPTY) {
        found.unshift({
          name: 'LM hash of an empty password',
          confidence: 0.99,
          reason: 'Exactly the constant LM produces for a blank password',
          context: 'This account has no LM password set',
        });
      }
      return {
        matches: found.sort((a, b) => b.confidence - a.confidence).slice(0, 5),
        summary: `${digits.length} hex digits (${digits.length * 4} bits)`,
        oneWay: true,
      };
    }
  }

  // A Base64 digest: the right length, and decoding to a digest-sized value.
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(text) && text.length >= 16 && text.length % 4 === 0) {
    const bytes = (text.length / 4) * 3 - (text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0);
    const names = BY_BYTE_LENGTH[bytes];
    if (names) {
      return {
        matches: names.map((name, index) => ({
          name: `${name} (Base64)`,
          // Lower than the hex equivalents: plenty of Base64 payloads happen to
          // be exactly digest-sized without being digests.
          confidence: Math.max(0.18, 0.45 - index * 0.08),
          reason: `Base64 decoding to ${bytes} bytes (${bytes * 8} bits)`,
        })),
        summary: `${text.length} Base64 characters, ${bytes} bytes decoded`,
        oneWay: false,
      };
    }
  }

  return null;
}
