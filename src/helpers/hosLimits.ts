import type { Segment } from './duty';
import { drivingMinutes, onDutyMinutes } from './duty';

/**
 * How much of each clock is left.
 *
 * The four figures on the recap strip are REMAINING time, not time used. That
 * is what a driver acts on — "10:50 driving" means they can drive ten more
 * hours, and reading it as ten hours driven would be exactly backwards on the
 * one number that decides whether they keep going.
 *
 * Limits come from the organisation's regulator, which the office sets. With
 * none chosen nothing is computed: an 11-hour driving limit under FMCSA is 9
 * under EU rules, and guessing would put a wrong number in front of a driver
 * who is about to rely on it.
 */

export type Regulator = 'FMCSA' | 'EU';

export function regulatorFrom(value: string | null): Regulator | null {
  const clean = (value ?? '').trim().toUpperCase();
  if (clean === 'FMCSA' || clean === 'DOT' || clean === 'US') return 'FMCSA';
  if (clean === 'EU' || clean === 'EC561' || clean === 'AETR') return 'EU';
  return null;
}

type Limits = {
  dailyDriving: number;
  /** Elapsed span from coming on duty. FMCSA only. */
  dutyWindow: number | null;
  drivingBeforeBreak: number;
  breakLength: number;
  cycle: number;
  cycleDays: number;
};

const H = 60;

/** Mirrors the console's rule engine — see hours/rules.ts there. */
const LIMITS: Record<Regulator, Limits> = {
  FMCSA: {
    dailyDriving: 11 * H,
    dutyWindow: 14 * H,
    drivingBeforeBreak: 8 * H,
    breakLength: 30,
    cycle: 70 * H,
    cycleDays: 8,
  },
  EU: {
    // 9 hours, extendable to 10 twice a week. Extensions are not tracked, so
    // 10 is used — being stricter would show a driver less time than they
    // legally have.
    dailyDriving: 10 * H,
    dutyWindow: null,
    drivingBeforeBreak: 4 * H + 30,
    breakLength: 45,
    cycle: 56 * H,
    cycleDays: 7,
  },
};

export function cycleDaysFor(regulator: Regulator): number {
  return LIMITS[regulator].cycleDays;
}

/**
 * The elapsed on-duty window: first coming on duty to last going off.
 *
 * Not the sum of on-duty time. The window is wall-clock, and a break in the
 * middle of a shift does not extend it — that is the whole point of the rule.
 */
function windowUsed(segments: Segment[]): number {
  const working = segments.filter(s => s.band === 'driving' || s.band === 'on_duty');
  if (working.length === 0) return 0;
  const first = Math.min(...working.map(s => s.from));
  const last = Math.max(...working.map(s => s.to));
  return Math.max(0, last - first);
}

/**
 * Driving since the last qualifying break.
 *
 * Walked in order rather than taken as a total, because the break has to come
 * BEFORE the driving it excuses. A driver who drove nine hours and then rested
 * has not complied, even though their longest break is long enough.
 */
function drivingSinceBreak(segments: Segment[], limits: Limits): number {
  const ordered = [...segments].sort((a, b) => a.from - b.from);

  let since = 0;
  let restRun = 0;
  let restEndsAt: number | null = null;

  for (const s of ordered) {
    const length = Math.max(0, s.to - s.from);

    if (s.band === 'off' || s.band === 'sleeper') {
      restRun = restEndsAt === s.from ? restRun + length : length;
      restEndsAt = s.to;
      if (restRun >= limits.breakLength) since = 0;
      continue;
    }

    restRun = 0;
    restEndsAt = null;
    if (s.band === 'driving') since += length;
  }

  return since;
}

export type Recap = {
  /** Minutes left, or null when the clock does not apply or is not known. */
  onDuty: number | null;
  driving: number | null;
  /** Driving left before a break is required. */
  breakIn: number | null;
  cycle: number | null;
};

/**
 * `cycleWindow` is the days that count toward the cycle, today included and
 * oldest first. Passed in rather than fetched so this stays a pure function.
 */
export function recapFor(
  regulator: Regulator | null,
  today: Segment[],
  cycleWindow: Segment[][],
): Recap {
  if (!regulator) return { onDuty: null, driving: null, breakIn: null, cycle: null };

  const limits = LIMITS[regulator];
  const left = (limit: number, used: number) => Math.max(0, limit - used);

  return {
    onDuty:
      limits.dutyWindow === null ? null : left(limits.dutyWindow, windowUsed(today)),
    driving: left(limits.dailyDriving, drivingMinutes(today)),
    breakIn: left(limits.drivingBeforeBreak, drivingSinceBreak(today, limits)),
    cycle: left(
      limits.cycle,
      cycleWindow.reduce((sum, day) => sum + onDutyMinutes(day), 0),
    ),
  };
}
