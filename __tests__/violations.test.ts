import { violationsForDay } from '../src/helpers/violations';
import { limitsFor } from '../src/helpers/hosLimits';
import type { Segment } from '../src/helpers/duty';

/**
 * The rule engine, which is a COPY of the console's.
 *
 * That copy is the reason this suite exists. Two apps judging the same day
 * differently would be worse than either being wrong alone — a driver whose
 * phone says they are legal and whose office says they are not has no way to
 * tell which to believe. These cases mirror the console's own, so a change on
 * one side that is not made on the other fails here.
 */

const H = 60;
const seg = (band: Segment['band'], fromH: number, toH: number): Segment => ({
  band,
  from: fromH * H,
  to: toH * H,
});

const DAY = '2026-09-04';

describe('violationsForDay (FMCSA)', () => {
  it('says nothing about an empty day', () => {
    /* A driver with no events was not necessarily resting, and a day nobody
       recorded is a missing log, not a breach. */
    expect(violationsForDay(limitsFor('FMCSA'), DAY, [], [])).toEqual([]);
  });

  it('passes a legal day', () => {
    const day = [seg('off', 0, 6), seg('driving', 6, 10), seg('off', 10, 11), seg('driving', 11, 15)];
    expect(violationsForDay(limitsFor('FMCSA'), DAY, day, [day])).toEqual([]);
  });

  it('catches driving past eleven hours', () => {
    /* Twelve hours driving, broken by an hour off so the break rule stays out
       of it — this case is about the daily limit alone. */
    const day = [seg('driving', 0, 6), seg('off', 6, 7), seg('driving', 7, 13)];
    const found = violationsForDay(limitsFor('FMCSA'), DAY, day, [day]);
    const driving = found.find((v) => v.kind === 'daily_driving');
    expect(driving).toBeDefined();
    expect(driving?.overage).toBe('1:00');
  });

  it('catches the fourteen-hour window even when driving is legal', () => {
    /*
     * The point of the window rule: four hours driving, a long rest, four
     * more. Driving is well inside the limit, but the shift spans sixteen
     * hours — which is exactly what the rule exists to stop.
     */
    const day = [seg('driving', 4, 8), seg('off', 8, 16), seg('driving', 16, 20)];
    const found = violationsForDay(limitsFor('FMCSA'), DAY, day, [day]);
    expect(found.find((v) => v.kind === 'daily_driving')).toBeUndefined();
    const window = found.find((v) => v.kind === 'duty_window');
    expect(window).toBeDefined();
    expect(window?.overage).toBe('2:00');
  });

  it('catches driving past eight hours with no break', () => {
    const day = [seg('driving', 0, 9)];
    const found = violationsForDay(limitsFor('FMCSA'), DAY, day, [day]);
    const brk = found.find((v) => v.kind === 'missing_break');
    expect(brk).toBeDefined();
    expect(brk?.overage).toBe('1:00');
  });

  it('accepts a thirty-minute break taken in time', () => {
    const day = [seg('driving', 0, 7), seg('off', 7, 7.5), seg('driving', 7.5, 14)];
    const found = violationsForDay(limitsFor('FMCSA'), DAY, day, [day]);
    expect(found.find((v) => v.kind === 'missing_break')).toBeUndefined();
  });

  it('does not accept a break taken after the limit was already passed', () => {
    /*
     * The whole reason the walk is ordered. Nine hours driving, THEN a rest:
     * totalling the day's driving and its longest break separately would pass
     * this, and it is precisely the thing the rule forbids.
     */
    const day = [seg('driving', 0, 9), seg('off', 9, 10), seg('driving', 10, 11)];
    const found = violationsForDay(limitsFor('FMCSA'), DAY, day, [day]);
    expect(found.find((v) => v.kind === 'missing_break')).toBeDefined();
  });

  it('adds consecutive rests together', () => {
    /* Off duty for fifteen minutes then sleeper for twenty is thirty-five
       minutes of rest, not two short ones that each fail. */
    const day = [
      seg('driving', 0, 7),
      seg('off', 7, 7.25),
      seg('sleeper', 7.25, 7.6),
      seg('driving', 7.6, 14),
    ];
    expect(
      violationsForDay(limitsFor('FMCSA'), DAY, day, [day]).find((v) => v.kind === 'missing_break'),
    ).toBeUndefined();
  });

  it('catches the seventy-hour cycle across the window', () => {
    /* Eight days of ten hours on duty is eighty. */
    const day = [seg('on_duty', 0, 10)];
    const window = Array.from({ length: 8 }, () => day);
    const cycle = violationsForDay(limitsFor('FMCSA'), DAY, day, window).find((v) => v.kind === 'cycle');
    expect(cycle).toBeDefined();
    expect(cycle?.overage).toBe('10:00');
  });

  it('stamps every violation with the day it happened on', () => {
    const day = [seg('driving', 0, 13)];
    for (const v of violationsForDay(limitsFor('FMCSA'), DAY, day, [day])) {
      expect(v.date).toBe(DAY);
    }
  });
});

describe('violationsForDay (EU)', () => {
  it('has no duty window rule, so a long split shift is not a breach', () => {
    /* FMCSA fails this exact day on the fourteen-hour window; EU has none. */
    const day = [seg('driving', 4, 8), seg('off', 8, 16), seg('driving', 16, 20)];
    const found = violationsForDay(limitsFor('EU'), DAY, day, [day]);
    expect(found.find((v) => v.kind === 'duty_window')).toBeUndefined();
  });

  it('needs a break after four and a half hours, not eight', () => {
    const day = [seg('driving', 0, 5)];
    expect(
      violationsForDay(limitsFor('EU'), DAY, day, [day]).find((v) => v.kind === 'missing_break'),
    ).toBeDefined();
    expect(
      violationsForDay(limitsFor('FMCSA'), DAY, day, [day]).find((v) => v.kind === 'missing_break'),
    ).toBeUndefined();
  });

  it('uses a fifty-six hour cycle over seven days', () => {
    const day = [seg('on_duty', 0, 9)];
    const window = Array.from({ length: 7 }, () => day);
    const cycle = violationsForDay(limitsFor('EU'), DAY, day, window).find((v) => v.kind === 'cycle');
    expect(cycle).toBeDefined();
    expect(cycle?.overage).toBe('7:00');
  });
});
