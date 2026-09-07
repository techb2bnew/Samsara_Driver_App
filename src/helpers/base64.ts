const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Character code → its 6-bit value. Built once. */
const VALUE: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i += 1) VALUE[ALPHABET[i]] = i;

/**
 * Base64 to bytes, written out rather than borrowed.
 *
 * Uploading a photograph needs its bytes, and in bare React Native there is no
 * reliable way to get them from a file:// uri. The documented approach —
 * `fetch(uri).then(r => r.arrayBuffer())` — comes from Expo, where a
 * filesystem module backs it. Here it resolves with an EMPTY buffer: no error,
 * no rejection, a zero-byte upload that Supabase accepts and stores. Which is
 * exactly how a paperwork photo could appear to send and arrive as nothing.
 *
 * So the picker is asked for base64 instead and this turns it into bytes.
 *
 * Not `atob`: it is present in some Hermes builds and absent in others, and
 * "works on my phone" is not a thing to hang a legal document on. Not
 * base64-js either — it is in node_modules today only because something else
 * depends on it, and a transitive dependency can vanish in an install.
 *
 * Whitespace and data: prefixes are tolerated, because pickers and platforms
 * disagree about whether to include them.
 */
export function base64ToBytes(input: string): Uint8Array {
  const clean = input
    .replace(/^data:[^;]*;base64,/, '')
    .replace(/[\r\n\s]/g, '')
    .replace(/=+$/, '');

  // Every 4 characters carry 3 bytes; a trailing 2 or 3 carry 1 or 2.
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));

  let byte = 0;
  let bits = 0;
  let written = 0;

  for (let i = 0; i < clean.length; i += 1) {
    const value = VALUE[clean[i]];
    if (value === undefined) continue;

    byte = (byte << 6) | value;
    bits += 6;

    // Whole byte assembled: take the top 8 bits and keep the remainder.
    if (bits >= 8) {
      bits -= 8;
      out[written] = (byte >> bits) & 0xff;
      written += 1;
    }
  }

  // A truncated string leaves the tail unwritten; hand back only what is real
  // rather than a buffer padded with zeros that would corrupt the file.
  return written === out.length ? out : out.subarray(0, written);
}
