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

export type Limits = {
  dailyDriving: number;
  /** Elapsed span from coming on duty. FMCSA only. */
  dutyWindow: number | null;
  drivingBeforeBreak: number;
  breakLength: number;
  cycle: number;
  cycleDays: number;
  /*
   * Consecutive minutes off duty required before driving again. Null where the
   * rule book has no such rule.
   *
   * CONSECUTIVE is the rule, not a detail of it: five hours off, work, five
   * more is not a rest under any regime, and adding the two together would
   * report a driver as compliant when they are not.
   */
  dailyRest: number | null;
  /*
   * The three below are a FLEET'S OWN POLICY, not law. Null on both built-in
   * regimes, because neither FMCSA nor EU 561/2006 contains any of them.
   */
  /** Work required before a break may be taken. */
  minWorkBeforeBreak: number | null;
  /** Longest single break, not counting a daily rest. */
  maxBreak: number | null;
  /** Longest on-duty-not-driving time in a day. */
  maxOnDuty: number | null;
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
    // 395.3(a)(1).
    dailyRest: 10 * H,
    // Not in 49 CFR 395. A fleet that wants these sets its own rule book.
    minWorkBeforeBreak: null,
    maxBreak: null,
    maxOnDuty: null,
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
    // Article 8. Reducible to 9 hours three times a week, which is not
    // tracked — so 9 is used, because flagging a legal reduction as a breach
    // would be worse than missing one short rest.
    dailyRest: 9 * H,
    // Not in 561/2006, as above.
    minWorkBeforeBreak: null,
    maxBreak: null,
    maxOnDuty: null,
  },
};

/**
 * The rule book's numbers, for anything that has to reason about them.
 *
 * Exported so violations.ts works from the same table the recap does. Two
 * copies of "11 hours" would drift, and the first sign of it would be a driver
 * whose remaining-time strip and violation list disagreed.
 */
export function limitsFor(regulator: Regulator): Limits {
  return LIMITS[regulator];
}

/**
 * A rule book the fleet wrote for itself, as it comes out of the database.
 *
 * Kept separate from limitsFor rather than folded in with it. The two built-in
 * regimes are checked against the regulations they cite; these are whatever
 * the office typed into a form. Two functions means the call site always shows
 * which kind is in hand.
 */
export type RuleBookRow = {
  daily_driving_minutes: number;
  duty_window_minutes: number | null;
  driving_before_break_minutes: number;
  break_length_minutes: number;
  cycle_minutes: number;
  cycle_days: number;
  daily_rest_minutes: number | null;
  min_work_before_break_minutes: number | null;
  max_break_minutes: number | null;
  max_on_duty_minutes: number | null;
};

export function limitsFromRuleBook(row: RuleBookRow): Limits {
  return {
    dailyDriving: row.daily_driving_minutes,
    dutyWindow: row.duty_window_minutes,
    drivingBeforeBreak: row.driving_before_break_minutes,
    breakLength: row.break_length_minutes,
    cycle: row.cycle_minutes,
    cycleDays: row.cycle_days,
    dailyRest: row.daily_rest_minutes,
    minWorkBeforeBreak: row.min_work_before_break_minutes,
    maxBreak: row.max_break_minutes,
    maxOnDuty: row.max_on_duty_minutes,
  };
}

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
/**
 * Driving time since the last qualifying break.
 *
 * Exported so the break reminder can watch it. The recap shows what is LEFT;
 * a reminder has to know how close the driver already is.
 */
export function drivingSinceBreak(segments: Segment[], limits: Limits): number {
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
  /*
   * Rest the driver still owes today, when the rule book requires any.
   *
   * Every clock on this strip is "what is left", and rest is no exception: a
   * driver who has slept two of ten hours has eight left to take. Showing it
   * the other way round — hours achieved, filling up — would make one ring on
   * the strip read backwards from the other four.
   */
  restOwed: number | null;
  /** On-duty-not-driving allowance left, on a rule book that caps it. */
  loadLeft: number | null;
  /*
   * How far PAST each limit the driver is, where they are past it.
   *
   * Carried separately because the figures above are floored at zero — a
   * driver who has overrun should read 0:00 left, not a negative number they
   * have to interpret. But flooring threw the overage away entirely, so a
   * clock that had run out drew an empty ring: nothing left to fill it with
   * and nothing to say how far past it went.
   *
   * Same keys, zero where the limit is not exceeded, null where there is no
   * such limit.
   */
  over: {
    onDuty: number | null;
    driving: number | null;
    breakIn: number | null;
    cycle: number | null;
    restOwed: number | null;
    loadLeft: number | null;
  };
};

/**
 * `cycleWindow` is the days that count toward the cycle, today included and
 * oldest first. Passed in rather than fetched so this stays a pure function.
 */
export function recapFor(
  limits: Limits | null,
  today: Segment[],
  cycleWindow: Segment[][],
): Recap {
  const nothing = {
    onDuty: null,
    driving: null,
    breakIn: null,
    cycle: null,
    restOwed: null,
    loadLeft: null,
  };

  if (!limits) return { ...nothing, over: nothing };

  const left = (limit: number, used: number) => Math.max(0, limit - used);
  const past = (limit: number, used: number) => Math.max(0, used - limit);

  const rested = today
    .filter(s => s.band === 'off' || s.band === 'sleeper')
    .reduce((sum, s) => sum + Math.max(0, s.to - s.from), 0);

  const loaded = today
    .filter(s => s.band === 'on_duty')
    .reduce((sum, s) => sum + Math.max(0, s.to - s.from), 0);

  /* Measured once, so left and over can never disagree about the same day. */
  const usedWindow = windowUsed(today);
  const usedDriving = drivingMinutes(today);
  const usedSinceBreak = drivingSinceBreak(today, limits);
  const usedCycle = cycleWindow.reduce((sum, day) => sum + onDutyMinutes(day), 0);

  return {
    onDuty: limits.dutyWindow === null ? null : left(limits.dutyWindow, usedWindow),
    driving: left(limits.dailyDriving, usedDriving),
    breakIn: left(limits.drivingBeforeBreak, usedSinceBreak),
    cycle: left(limits.cycle, usedCycle),
    /*
     * Total rest in the day, not the consecutive run the violation check uses.
     * The two answer different questions: the check asks whether the driver
     * was fit to start, and this asks how much of the day's rest is still to
     * come. A driver looking at the strip mid-afternoon wants the second.
     */
    restOwed: limits.dailyRest === null ? null : left(limits.dailyRest, rested),
    loadLeft: limits.maxOnDuty === null ? null : left(limits.maxOnDuty, loaded),
    over: {
      onDuty: limits.dutyWindow === null ? null : past(limits.dutyWindow, usedWindow),
      driving: past(limits.dailyDriving, usedDriving),
      breakIn: past(limits.drivingBeforeBreak, usedSinceBreak),
      cycle: past(limits.cycle, usedCycle),
      /* Rest is a requirement, not an allowance: there is no overrunning it. */
      restOwed: limits.dailyRest === null ? null : 0,
      loadLeft: limits.maxOnDuty === null ? null : past(limits.maxOnDuty, loaded),
    },
  };
}
