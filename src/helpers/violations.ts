import type { Band, Segment } from './duty';
import { drivingMinutes, formatClock, onDutyMinutes } from './duty';
import { type Limits } from './hosLimits';

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
  kind:
    | 'daily_driving'
    | 'duty_window'
    | 'missing_break'
    | 'cycle'
    | 'daily_rest'
    /* The three below come from a fleet's own rule book, not a regulation. */
    | 'break_too_early'
    | 'break_too_long'
    | 'on_duty_too_long';
  /** ISO date of the day it happened on. */
  date: string;
  /** What the limit was. */
  limit: string;
  /** What was actually recorded. */
  actual: string;
  /** How far past. */
  overage: string;
  /*
   * Whether a regulation was broken, or one of the fleet's own shift rules.
   *
   * Carried as a flag rather than baked into the label. A driver asked about
   * their log by an inspector needs to be able to tell the two apart at a
   * glance, and "(fleet rule)" tacked onto the end of a sentence is the
   * easiest thing on a card to skim past.
   */
  legal: boolean;
  /*
   * Minute of the day the breach happened at, for the ones that are a moment
   * rather than a total.
   *
   * Null for daily driving, the cycle and the rest — those are the whole day
   * added up and pointing at a time would be inventing one. But "break taken
   * too early" without saying WHICH break is something a driver cannot act on.
   */
  at: number | null;
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
/** Statuses that are work. The other two are rest. */
const WORK: Segment['band'][] = ['driving', 'on_duty'];

const DAY_MINUTES = 24 * 60;

/**
 * How long a rest has to be before it counts as ending the shift rather than
 * interrupting it, when the rule book does not say.
 *
 * This distinction is the whole reason a break cap can exist. A fleet that
 * caps breaks at three hours does not mean its drivers may not sleep for ten —
 * it means they may not sit for four in the middle of a shift. Without telling
 * the two apart, "max break 3h" would flag every night's rest.
 *
 * Eight hours, used only when the rule book sets no daily rest. No regime's is
 * shorter: the EU's reduced rest is nine and FMCSA's is ten.
 */
const REST_ENDS_SHIFT = 8 * 60;

function restFloor(limits: Limits): number {
  return limits.dailyRest ?? REST_ENDS_SHIFT;
}

/**
 * Every rest block in the day, with the work that came immediately before it.
 *
 * Contiguous rest of any kind is joined: a driver who taps Off duty and then
 * Sleeper has taken ONE rest, and counting them separately would let a
 * four-hour rest taken as two twos slip under a three-hour cap.
 */
function restsWithPrecedingWork(
  today: Segment[],
): Array<{ rest: number; workBefore: number; at: number }> {
  const ordered = [...today].sort((a, b) => a.from - b.from);
  const out: Array<{ rest: number; workBefore: number; at: number }> = [];

  let work = 0;
  let rest = 0;
  let restStart = 0;

  const flush = () => {
    if (rest > 0) {
      out.push({ rest, workBefore: work, at: restStart });
      /* Work resets: the next break has to be earned again. */
      work = 0;
    }
    rest = 0;
  };

  for (const seg of ordered) {
    const length = Math.max(0, seg.to - seg.from);
    if (WORK.includes(seg.band)) {
      flush();
      work += length;
    } else {
      if (rest === 0) restStart = seg.from;
      rest += length;
    }
  }
  flush();

  return out;
}

/**
 * Consecutive minutes off duty immediately before the driver started work.
 *
 * ---------------------------------------------------------------------------
 * Why it reaches into yesterday
 * ---------------------------------------------------------------------------
 * A night's sleep crosses midnight, which is the normal case rather than an
 * edge one. Segments are stored per calendar day, so a rest from 21:00 to
 * 07:00 is two segments in two days — and a check that only looked at today
 * would see seven hours where there were ten, and report a violation against
 * a driver who slept properly.
 *
 * So the run is walked backwards from the first working segment of today, and
 * when it reaches midnight it continues into the end of yesterday.
 *
 * Null when the driver did no work at all: there was nothing to be rested for,
 * and a day off is not a breach.
 *
 * Deliberately a copy of the console's restBeforeWork, like the rest of this
 * file. See the note at the top.
 */
function restBeforeWork(today: Segment[], yesterday: Segment[]): number | null {
  const ordered = [...today].sort((a, b) => a.from - b.from);
  const firstWork = ordered.find(seg => WORK.includes(seg.band));
  if (!firstWork) return null;

  let rest = 0;
  let edge = firstWork.from;

  for (const seg of [...ordered].reverse()) {
    if (seg.to !== edge) continue;
    if (WORK.includes(seg.band)) break;
    rest += seg.to - seg.from;
    edge = seg.from;
  }

  /*
   * Only continue into yesterday if the run actually reached midnight.
   * Stopping short means the driver was working at midnight, and yesterday's
   * rest belongs to yesterday's shift rather than to this one.
   */
  if (edge !== 0) return rest;

  let yEdge = DAY_MINUTES;
  for (const seg of [...yesterday].sort((a, b) => a.from - b.from).reverse()) {
    if (seg.to !== yEdge) break;
    if (WORK.includes(seg.band)) break;
    rest += seg.to - seg.from;
    yEdge = seg.from;
  }

  return rest;
}

export function violationsForDay(
  limits: Limits,
  isoDate: string,
  today: Segment[],
  cycleWindow: Segment[][],
  /*
   * The day before, for the daily-rest check. Required rather than optional:
   * an optional argument a caller forgets is a legal check that silently
   * stops running, which is worse than one that was never written.
   *
   * Pass [] for the oldest day loaded — the rest before it cannot be known,
   * and the check is skipped rather than guessed.
   */
  yesterday: Segment[],
): Violation[] {
  if (today.length === 0) return [];

  const out: Violation[] = [];

  const driving = drivingMinutes(today);
  if (driving > limits.dailyDriving) {
    out.push({
      id: `${isoDate}-driving`,
      kind: 'daily_driving',
      legal: true,
      at: null,
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
      legal: true,
      at: null,
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
      legal: true,
      at: null,
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
  /*
   * Daily rest. Skipped when yesterday was not loaded, because a rest that
   * began in a day nobody fetched would look like no rest at all.
   */
  if (limits.dailyRest !== null && yesterday.length > 0) {
    const rested = restBeforeWork(today, yesterday);
    if (rested !== null && rested < limits.dailyRest) {
      out.push({
        id: `${isoDate}-rest`,
        kind: 'daily_rest',
      legal: true,
      at: null,
        date: isoDate,
        limit: `${formatClock(limits.dailyRest)} off duty before driving`,
        actual: `${formatClock(rested)} off duty before coming on`,
        overage: formatClock(limits.dailyRest - rested),
      });
    }
  }

  /*
   * A fleet's own shift rules, skipped unless the rule book sets them — which
   * the two legal regimes never do.
   *
   * The day's rest is exempt from both break rules. A ten-hour sleep is not a
   * four-hour break that overran, and it is not a break taken before the
   * driver had earned one: it is the end of the shift.
   */
  if (limits.minWorkBeforeBreak !== null || limits.maxBreak !== null) {
    const floor = restFloor(limits);

    for (const block of restsWithPrecedingWork(today)) {
      if (block.rest >= floor) continue;

      if (
        limits.minWorkBeforeBreak !== null &&
        block.workBefore > 0 &&
        block.workBefore < limits.minWorkBeforeBreak
      ) {
        out.push({
          id: `${isoDate}-early-${block.at}`,
          kind: 'break_too_early',
          legal: false,
          at: block.at,
          date: isoDate,
          limit: `${formatClock(limits.minWorkBeforeBreak)} of work before a break`,
          actual: `${formatClock(block.workBefore)} of work before stopping`,
          overage: formatClock(limits.minWorkBeforeBreak - block.workBefore),
        });
      }

      if (limits.maxBreak !== null && block.rest > limits.maxBreak) {
        out.push({
          id: `${isoDate}-long-${block.at}`,
          kind: 'break_too_long',
          legal: false,
          at: block.at,
          date: isoDate,
          limit: `${formatClock(limits.maxBreak)} break`,
          actual: `${formatClock(block.rest)} break`,
          overage: formatClock(block.rest - limits.maxBreak),
        });
      }
    }
  }

  if (limits.maxOnDuty !== null) {
    /* Loading and unloading, without the driving. */
    const working = today
      .filter(seg => seg.band === 'on_duty')
      .reduce((sum, seg) => sum + Math.max(0, seg.to - seg.from), 0);

    if (working > limits.maxOnDuty) {
      out.push({
        id: `${isoDate}-onduty`,
        kind: 'on_duty_too_long',
        legal: false,
        at: null,
        date: isoDate,
        limit: `${formatClock(limits.maxOnDuty)} on duty, not driving`,
        actual: `${formatClock(working)} on duty, not driving`,
        overage: formatClock(working - limits.maxOnDuty),
      });
    }
  }

  const cycle = cycleWindow.reduce((sum, day) => sum + onDutyMinutes(day), 0);
  if (cycle > limits.cycle) {
    out.push({
      id: `${isoDate}-cycle`,
      kind: 'cycle',
      legal: true,
      at: null,
      date: isoDate,
      limit: `${formatClock(limits.cycle)} on duty over ${limits.cycleDays} days`,
      actual: `${formatClock(cycle)} on duty`,
      overage: formatClock(cycle - limits.cycle),
    });
  }

  return out;
}
