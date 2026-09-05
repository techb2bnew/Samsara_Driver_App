import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * The current time, kept current.
 *
 * The duty graph and the day's totals are not functions of the events alone —
 * they are functions of the events AND the clock. The segment a driver is in
 * right now has no end time in the table, so it is drawn up to "now", and
 * "driving today" is the time from the last change until "now". Read that
 * clock once at mount and the whole screen freezes at the moment it opened: a
 * driver who went on duty at 09:00 and looked again at 11:00 saw a two hour
 * shift reported as nothing.
 *
 * Ticking on the minute boundary, not every second. Everything on that screen
 * is displayed to the minute, so a faster tick would re-render four hundred
 * times for four hundred identical frames — on a phone that is in a cradle
 * with the screen on all shift, that is battery for nothing.
 *
 * Re-read on return to the foreground as well. A phone throttles or stops
 * timers in the background, so a driver who locked the screen for an hour
 * comes back to an interval that has not fired; waiting up to a minute for the
 * first tick would show them a stale log at the exact moment they opened the
 * app to check it.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    /*
     * Scheduled to the next minute boundary rather than at a fixed interval,
     * so the displayed minute changes when the clock's minute changes. A plain
     * 60s interval started at :47 would flip every value at :47 past the
     * minute, which reads as a lagging screen next to the truck's own clock.
     */
    const tick = () => {
      const at = new Date();
      setNow(at);
      timer = setTimeout(tick, 60_000 - (at.getSeconds() * 1000 + at.getMilliseconds()));
    };

    const first = new Date();
    timer = setTimeout(
      tick,
      60_000 - (first.getSeconds() * 1000 + first.getMilliseconds()),
    );

    const sub = AppState.addEventListener('change', next => {
      if (next !== 'active') return;
      if (timer) clearTimeout(timer);
      tick();
    });

    return () => {
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return now;
}
