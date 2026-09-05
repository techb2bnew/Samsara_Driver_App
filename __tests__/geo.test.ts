import { formatDistance, metresBetween } from '../src/helpers/geo';

/**
 * The arithmetic behind the arrival check.
 *
 * Worth testing because it is the only part of that check that can be tested:
 * whether a phone gets a fix depends on the sky, but whether 1,000 metres is
 * measured as 1,000 metres does not — and the check refuses a driver at
 * 1,001. A latitude/longitude mix-up or a degrees/radians slip would pass
 * every stop or fail every stop, and both look like "the GPS is bad".
 */
describe('metresBetween', () => {
  it('is zero for the same point', () => {
    const p = { latitude: 30.7046, longitude: 76.7179 };
    expect(metresBetween(p, p)).toBe(0);
  });

  it('measures a known short distance', () => {
    /*
     * 0.001° of latitude is about 111 m anywhere on Earth. Latitude is the
     * safe axis to assert on: a degree of longitude shrinks towards the poles,
     * so a longitude-based expectation would bake in a location.
     */
    const a = { latitude: 30.7046, longitude: 76.7179 };
    const b = { latitude: 30.7056, longitude: 76.7179 };
    expect(metresBetween(a, b)).toBeGreaterThan(105);
    expect(metresBetween(a, b)).toBeLessThan(118);
  });

  it('is symmetric', () => {
    const a = { latitude: 30.7046, longitude: 76.7179 };
    const b = { latitude: 28.6139, longitude: 77.209 };
    expect(metresBetween(a, b)).toBe(metresBetween(b, a));
  });

  it('measures Mohali to Delhi at roughly the right scale', () => {
    const mohali = { latitude: 30.7046, longitude: 76.7179 };
    const delhi = { latitude: 28.6139, longitude: 77.209 };
    const km = metresBetween(mohali, delhi) / 1000;
    /* About 240 km as the crow flies. Wide bounds — this is a sanity check on
       the formula, not a survey. */
    expect(km).toBeGreaterThan(225);
    expect(km).toBeLessThan(255);
  });

  it('does not confuse latitude with longitude', () => {
    /*
     * The classic bug. At this latitude a degree of longitude is about 14%
     * shorter than a degree of latitude, so swapping the axes gives a
     * different answer — which is what makes this assertable.
     */
    const straightUp = metresBetween(
      { latitude: 30.0, longitude: 76.0 },
      { latitude: 31.0, longitude: 76.0 },
    );
    const straightAcross = metresBetween(
      { latitude: 30.0, longitude: 76.0 },
      { latitude: 30.0, longitude: 77.0 },
    );
    expect(straightUp).toBeGreaterThan(straightAcross);
  });

  it('handles the antipodes without returning NaN', () => {
    /* Math.sqrt of a rounding error above 1 would give NaN, and NaN compares
       false against the radius — every arrival would be allowed. */
    const d = metresBetween(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 180 },
    );
    expect(Number.isFinite(d)).toBe(true);
    expect(d).toBeGreaterThan(20_000_000);
  });
});

describe('formatDistance', () => {
  it('rounds metres to the nearest ten, because GPS is not exact to one', () => {
    expect(formatDistance(0)).toBe('0 m');
    expect(formatDistance(46)).toBe('50 m');
    expect(formatDistance(854)).toBe('850 m');
  });

  it('switches to kilometres at a thousand', () => {
    expect(formatDistance(1000)).toBe('1.0 km');
    expect(formatDistance(4238)).toBe('4.2 km');
  });
});
