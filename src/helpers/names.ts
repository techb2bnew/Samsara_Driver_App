/**
 * A person's name, the way it should be read.
 *
 * Names are stored as typed. Somebody adding a driver in a hurry types
 * "shubham", and it shows that way on the driver's own profile card and in
 * the greeting on the Duty screen — the first thing they see every shift.
 *
 * Only the first letter of each part, and only when it is lower case. The rest
 * is left exactly as typed: title-casing the whole thing turns "McDonald" into
 * "Mcdonald" and "O'Brien" into "O'brien", a correction that is wrong more
 * often than the thing it fixes.
 *
 * Nothing here writes anything back. Only the display is normalised — the same
 * rule the console applies, in lib/names.ts there.
 */
function capitalise(part: string): string {
  const clean = part.trim();
  if (!clean) return '';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/** "shubham" + "Kumar" → "Shubham Kumar". Empty parts are dropped. */
export function personName(first?: string | null, last?: string | null): string {
  return [capitalise(first ?? ''), capitalise(last ?? '')].filter(Boolean).join(' ');
}

/** One name on its own — a greeting, a message sender. */
export function displayName(name?: string | null): string {
  return (name ?? '')
    .trim()
    .split(/\s+/)
    .map(capitalise)
    .filter(Boolean)
    .join(' ');
}
