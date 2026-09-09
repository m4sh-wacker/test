/**
 * Byte-level helpers shared by operations and detection.
 *
 * Strings crossing the operation boundary are treated as byte strings: one
 * character per byte, code points 0-255. Text is decoded to UTF-16 only at the
 * edges, so a decode step that produces binary does not silently corrupt it.
 */

export function toBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function fromBytes(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

/** Decodes strictly, returning null when the bytes are not valid UTF-8. */
export function tryDecodeUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Turns bytes into text **for display**, never for the next step.
 *
 * Valid UTF-8 comes back as text; anything else is shown one character per
 * byte, because a lossy decode would replace every invalid sequence with
 * U+FFFD. Operations must not return this: the reading is not reversible, so
 * bytes that happen to be valid UTF-8 would come back through `asBytes` as
 * different bytes — 0xC3 0xA9 goes out as 'é' and returns as 0xE9. Between
 * steps the currency is `bytesToLatin1`, which round-trips exactly.
 */
export function bytesToText(bytes: Uint8Array): string {
  return tryDecodeUtf8(bytes) ?? bytesToLatin1(bytes);
}

/**
 * Renders a byte string for a person to read.
 *
 * The interface calls this at the moment output reaches the screen, the
 * clipboard, or a report — and nowhere else. Everything upstream of that is
 * bytes, so that a decode chain, a hash and a download all see what was
 * actually there.
 */
export function renderText(byteString: string): string {
  return bytesToText(asBytes(byteString));
}

/** One character per byte. Used when an operation must not reinterpret bytes. */
export function bytesToLatin1(bytes: Uint8Array): string {
  let out = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return out;
}

export function latin1ToBytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

export function byteLength(text: string): number {
  return asBytes(text).length;
}

/**
 * Interprets a string that may be either text or a byte string carried between
 * decode steps. A byte string never contains a code point above 0xFF, and for
 * plain ASCII both readings produce identical bytes — so this is safe for text
 * and correct for binary.
 */
export function asBytes(text: string): Uint8Array {
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 0xff) return toBytes(text);
  }
  return latin1ToBytes(text);
}

/** Shannon entropy in bits per byte. 0 = uniform, 8 = maximally random. */
export function shannonEntropy(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0;
  const counts = new Uint32Array(256);
  for (const b of bytes) counts[b]!++;

  let entropy = 0;
  for (const count of counts) {
    if (count === 0) continue;
    const p = count / bytes.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/** Fraction of bytes that are printable ASCII, tab, newline or carriage return. */
export function printableRatio(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0;
  let printable = 0;
  for (const b of bytes) {
    if ((b >= 0x20 && b <= 0x7e) || b === 0x09 || b === 0x0a || b === 0x0d) printable++;
  }
  return printable / bytes.length;
}

/** Describes the character set actually present, for evidence chips. */
export function describeCharset(text: string): string {
  const has = {
    lower: /[a-z]/.test(text),
    upper: /[A-Z]/.test(text),
    digit: /[0-9]/.test(text),
    hexOnly: /^[0-9a-fA-F\s]+$/.test(text),
    b64: /^[A-Za-z0-9+/=\s]+$/.test(text),
    b64url: /^[A-Za-z0-9\-_=.\s]+$/.test(text),
  };
  if (has.hexOnly) return '0-9 a-f only';
  if (has.b64) return 'A-Z a-z 0-9 + / =';
  if (has.b64url) return 'A-Z a-z 0-9 - _ .';
  const parts: string[] = [];
  if (has.upper) parts.push('A-Z');
  if (has.lower) parts.push('a-z');
  if (has.digit) parts.push('0-9');
  return parts.length ? parts.join(' ') : 'non-alphanumeric';
}

export function truncate(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max)}…`;
}

/** A short, readable sample of a byte string, for evidence and report lines. */
export function previewText(byteString: string, max = 160): string {
  return truncate(renderText(byteString), max);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} ${n === 1 ? 'byte' : 'bytes'}`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
