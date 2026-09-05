import type { Band, Segment } from './duty';
import { drivingMinutes, formatClock, onDutyMinutes } from './duty';
import { limitsFor, type Regulator } from './hosLimits';

/**
 * Judging a driver's day against the rule book.
 *
 * Ported from the console's hours/rules.ts, deliberately as a copy rather than
 * a shared package: the two apps are separate repos, and a driver's phone
 * showing a different verdict from the office's screen would be worse than
 * either being wrong on its own. Any change here has to be made there too, and
 * the tests on both sides use the same cases.
 *
 * What this does NOT check, and nothing anywhere claims it does:
 *   - the 34-hour restart, so a cycle total can be reported that a restart
 *     would have cleared
 *   - split sleeper-berth pairs
 *   - the EU 9-to-10-hour extension, twice a week: 10 is used throughout,
 *     because showing a driver less time than they legally have is the worse
 *     direction to be wrong in
 *   - personal conveyance and yard move, which the schema records but which
 *     count as on duty here
 */

export type Violation = {
  /** Stable within a date, so a list can key on it. */
  id: string;
  kind: 'daily_driving' | 'duty_window' | 'missing_break' | 'cycle';
  /** ISO date of the day it happened on. */
  date: string;
  /** What the limit was. */
  limit: string;
  /** What was actually recorded. */
  actual: string;
  /** How far past. */
  overage: string;
};

const WORKING: Band[] = ['driving', 'on_duty'];

/**
 * The span from first coming on duty to last going off.
 *
 * Not the sum of on-duty time — the 14-hour window is elapsed time, and breaks
 * inside a shift do not extend it. That is the whole point of the rule: a
 * driver cannot stretch an 11-hour driving day across 20 hours by resting in
 * the middle.
 */
function dutyWindowMinutes(segments: Segment[]): number {
  const working = segments.filter((s) => WORKING.includes(s.band));
  if (working.length === 0) return 0;
  const first = Math.min(...working.map((s) => s.from));
  const last = Math.max(...working.map((s) => s.to));
  return Math.max(0, last - first);
}

/**
 * The longest run of driving with no qualifying break before it.
 *
 * Walks the day in order. Counting the day's total driving and its longest
 * break separately would pass a driver who drove ten hours straight and then
 * rested — the break has to come FIRST, which is the only thing this rule is
 * about.
 *
 * Consecutive rest segments are added together: a driver who goes off duty and
 * then into the sleeper has rested for the sum of the two, not the longer.
 */
function drivingWithoutBreak(segments: Segment[], breakLength: number): number {
  const ordered = [...segments].sort((a, b) => a.from - b.from);

  let since = 0;
  let worst = 0;
  let restRun = 0;
  let restEndsAt: number | null = null;

  for (const segment of ordered) {
    const length = Math.max(0, segment.to - segment.from);

    if (segment.band === 'off' || segment.band === 'sleeper') {
      restRun = restEndsAt === segment.from ? restRun + length : length;
      restEndsAt = segment.to;
      if (restRun >= breakLength) since = 0;
      continue;
    }

    restRun = 0;
    restEndsAt = null;
    if (segment.band === 'driving') {
      since += length;
      if (since > worst) worst = since;
    }
  }

  return worst;
}

/**
 * Judges one day.
 *
 * `cycleWindow` is every day that counts toward the cycle, this one included.
 * An empty day returns nothing: a driver with no events was not necessarily
 * resting, and a cycle total on its own is not a breach.
 */
export function violationsForDay(
  regulator: Regulator,
  isoDate: string,
  today: Segment[],
  cycleWindow: Segment[][],
): Violation[] {
  if (today.length === 0) return [];

  const limits = limitsFor(regulator);
  const out: Violation[] = [];

  const driving = drivingMinutes(today);
  if (driving > limits.dailyDriving) {
    out.push({
      id: `${isoDate}-driving`,
      kind: 'daily_driving',
      date: isoDate,
      limit: `${formatClock(limits.dailyDriving)} driving`,
      actual: `${formatClock(driving)} driving`,
      overage: formatClock(driving - limits.dailyDriving),
    });
  }

  if (limits.dutyWindow !== null) {
    const window = dutyWindowMinutes(today);
    if (window > limits.dutyWindow) {
      out.push({
        id: `${isoDate}-window`,
        kind: 'duty_window',
        date: isoDate,
        limit: `${formatClock(limits.dutyWindow)} on-duty window`,
        actual: `${formatClock(window)} from coming on duty to going off`,
        overage: formatClock(window - limits.dutyWindow),
      });
    }
  }

  const unbroken = drivingWithoutBreak(today, limits.breakLength);
  if (unbroken > limits.drivingBeforeBreak) {
    out.push({
      id: `${isoDate}-break`,
      kind: 'missing_break',
      date: isoDate,
      limit: `${limits.breakLength}-minute break after ${formatClock(limits.drivingBeforeBreak)} driving`,
      actual: `${formatClock(unbroken)} driving with no break`,
      overage: formatClock(unbroken - limits.drivingBeforeBreak),
    });
  }

  /*
   * The cycle is reported against the day at the end of the window, not spread
   * across every day in it. A driver who is 2 hours over sees one violation
   * dated today, not eight identical ones.
   */
  const cycle = cycleWindow.reduce((sum, day) => sum + onDutyMinutes(day), 0);
  if (cycle > limits.cycle) {
    out.push({
      id: `${isoDate}-cycle`,
      kind: 'cycle',
      date: isoDate,
      limit: `${formatClock(limits.cycle)} on duty over ${limits.cycleDays} days`,
      actual: `${formatClock(cycle)} on duty`,
      overage: formatClock(cycle - limits.cycle),
    });
  }

  return out;
}
