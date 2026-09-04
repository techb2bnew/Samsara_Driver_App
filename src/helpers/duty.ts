import type { DutyEvent, DutyStatus } from '../supabase/api';

/**
 * Duty-status arithmetic for the app.
 *
 * Pure functions over events. Nothing here talks to the network or reads the
 * clock except where a `now` is passed in, so the same events always produce
 * the same day — which is the only way this is checkable.
 *
 * The four bands the graph draws are not the six statuses the database stores.
 * Personal conveyance and yard move are on-duty time to look at, but they are
 * separate statuses because the RULES treat them differently — so the mapping
 * lives here and the storage keeps the detail.
 */

/** What the graph draws. */
export type Band = 'off' | 'sleeper' | 'driving' | 'on_duty';

export type Segment = { band: Band; from: number; to: number };

const BAND_OF: Record<DutyStatus, Band> = {
  off_duty: 'off',
  sleeper_berth: 'sleeper',
  driving: 'driving',
  on_duty_not_driving: 'on_duty',
  personal_conveyance: 'on_duty',
  yard_move: 'on_duty',
};

export const BANDS: Band[] = ['off', 'sleeper', 'driving', 'on_duty'];

export const MINUTES_IN_DAY = 24 * 60;

/** Minutes past midnight, in the given timezone-naive local time. */
function minutesInto(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * One day's events into bands the graph can draw.
 *
 * A status runs until the next event, which is why only the start is stored.
 * The last block runs to midnight, or to `now` if the day is still going — a
 * driver who is on duty right now has not finished being on duty, and drawing
 * to midnight would credit them hours they have not worked.
 */
export function segmentsForDay(
  events: DutyEvent[],
  date: Date,
  now: Date = new Date(),
): Segment[] {
  const key = isoDate(date);
  const ofDay = events
    .filter(e => isoDate(new Date(e.startedAt)) === key)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  if (ofDay.length === 0) return [];

  const today = isoDate(now) === key;
  const endOfDay = today ? now.getHours() * 60 + now.getMinutes() : MINUTES_IN_DAY;

  return ofDay.map((event, i) => ({
    band: BAND_OF[event.status] ?? 'on_duty',
    from: minutesInto(event.startedAt),
    to: i + 1 < ofDay.length ? minutesInto(ofDay[i + 1].startedAt) : endOfDay,
  }));
}

/** Minutes in each band. */
export function totals(segments: Segment[]): Record<Band, number> {
  const out: Record<Band, number> = { off: 0, sleeper: 0, driving: 0, on_duty: 0 };
  for (const s of segments) out[s.band] += Math.max(0, s.to - s.from);
  return out;
}

/** Driving and on-duty-not-driving both count against the on-duty clock. */
export function onDutyMinutes(segments: Segment[]): number {
  const t = totals(segments);
  return t.driving + t.on_duty;
}

export function drivingMinutes(segments: Segment[]): number {
  return totals(segments).driving;
}

/**
 * The longest unbroken rest in the day.
 *
 * Adjacent off-duty and sleeper count as ONE break: a driver moving from the
 * cab to the bunk has not interrupted their rest, and treating that as two
 * shorter breaks turns a compliant 45-minute stop into two 20-minute ones.
 *
 * Blocks with a gap between them are not joined — something happened in the
 * gap that was not recorded, and bridging it would invent rest nobody took.
 */
export function longestBreakMinutes(segments: Segment[]): number {
  const ordered = [...segments].sort((a, b) => a.from - b.from);

  let longest = 0;
  let run = 0;
  let runEndsAt: number | null = null;

  for (const s of ordered) {
    const resting = s.band === 'off' || s.band === 'sleeper';
    const length = Math.max(0, s.to - s.from);

    if (resting && runEndsAt === s.from) run += length;
    else if (resting) run = length;
    else run = 0;

    runEndsAt = resting ? s.to : null;
    if (run > longest) longest = run;
  }

  return longest;
}

/** "8.5" — decimal hours, the way the totals column on a paper log reads. */
export function formatHours(minutes: number): string {
  return (Math.round((Math.max(0, minutes) / 60) * 10) / 10).toFixed(1);
}

/** "7:26" — hours and minutes, the way a log book reads. */
export function formatClock(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

/** "14:35" from a timestamp, for "on duty since". */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** The status a driver is on right now, or null before their first event. */
export function currentStatus(events: DutyEvent[]): DutyEvent | null {
  if (events.length === 0) return null;
  return [...events].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
}
