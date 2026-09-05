import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as api from '../supabase/api';
import type { AssignedRoute, DutyEvent, DutyStatus } from '../supabase/api';
import { isoDate } from '../helpers/duty';
import { useAuth } from './AuthContext';

/**
 * The shift: which truck, and what the driver has been doing today.
 *
 * Held above the tabs because three of them need it. Duty changes the status,
 * Route attaches arrivals to the truck, and Inspect files against it — if each
 * read it separately they would disagree the moment one of them wrote.
 *
 * The window is five days, not one. The graph shows today, but the day
 * boundary is the DEPOT's, and a driver who came on duty at 22:00 has events
 * that belong to yesterday's log. Loading a single date would cut those off.
 */

type ShiftValue = {
  loading: boolean;
  error: string | null;
  /** The truck signed on to, or null before one is picked. */
  vehicle: { assignmentId: string; vehicleId: string; name: string; plate: string } | null;
  /** The assigned route, loaded with the shift so the Route tab is not a second wait. */
  route: AssignedRoute | null;
  /** Original duty events across the loaded window, oldest first. */
  events: DutyEvent[];
  /** ISO dates that have been certified. */
  certifiedDates: ReadonlySet<string>;
  /** How far back the loaded events reach. Earlier days would draw empty. */
  earliestDate: string;
  refresh: () => Promise<void>;
  signOnToVehicle: (vehicleId: string) => Promise<void>;
  changeStatus: (status: DutyStatus) => Promise<void>;
  certifyDay: (date: string) => Promise<void>;
};

const ShiftContext = createContext<ShiftValue | null>(null);

/**
 * How far back the duty events are loaded.
 *
 * Eight, because that is FMCSA's cycle window and the recap strip totals
 * on-duty time across it. Five would leave the cycle figure quietly short by
 * three days — a number a driver would rely on and that nothing would flag.
 */
const WINDOW_DAYS = 8;

export function ShiftProvider({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const profile = state.status === 'signedIn' ? state.profile : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<ShiftValue['vehicle']>(null);
  const [route, setRoute] = useState<AssignedRoute | null>(null);
  const [events, setEvents] = useState<DutyEvent[]>([]);
  const [certifiedDates, setCertifiedDates] = useState<ReadonlySet<string>>(new Set());

  /*
   * The oldest day the loaded events cover. The log screen stops here rather
   * than letting a driver page back into days whose events were never fetched
   * — an empty grid for a day they know they worked reads as lost data.
   */
  const earliestDate = useMemo(() => {
    const first = new Date();
    first.setDate(first.getDate() - (WINDOW_DAYS - 1));
    return isoDate(first);
  }, []);

  const refresh = useCallback(async () => {
    if (!profile) return;

    setError(null);
    try {
      const from = new Date();
      from.setDate(from.getDate() - WINDOW_DAYS);
      const to = new Date();
      to.setDate(to.getDate() + 1);

      const [current, dutyEvents, logs, assigned] = await Promise.all([
        api.loadCurrentVehicle(profile.driverId),
        api.loadDutyEvents(profile.driverId, from.toISOString(), to.toISOString()),
        api.loadDailyLogs(profile.driverId, isoDate(from), isoDate(new Date())),
        api.loadMyRoute(profile.driverId),
      ]);

      setVehicle(current);
      setRoute(assigned);
      setEvents(dutyEvents);
      setCertifiedDates(
        new Set(logs.filter(l => l.certifiedAt !== null).map(l => l.logDate)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your shift.');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /*
   * Read through a ref so the subscription below depends only on the driver.
   *
   * refresh happens to be memoised on the same value today, so naming it as a
   * dependency would work — but a socket that reconnects whenever an unrelated
   * dependency is added to refresh is a nasty thing to debug, and a dropped
   * reconnect means the other phone goes quiet.
   */
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  /*
   * The same login on a second device.
   *
   * Without this, two phones signed in as one driver disagree about what duty
   * status they are in until somebody pulls to refresh — and duty status is
   * the driver's legal record. The office changing a status, or a correction
   * being approved, lands the same way.
   *
   * Debounced, and the delay is doing real work. A phone hears its own insert
   * as well as the other device's, and a status change writes one row that
   * this provider has already applied optimistically; without the delay every
   * tap would cost two reads of an eight day window. The trailing edge also
   * collapses a burst — the office approving four corrections at once is one
   * read, not four.
   */
  useEffect(() => {
    if (!profile) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = api.onMyDutyChanged(profile.driverId, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        refreshRef.current().catch(() => {});
      }, 900);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [profile]);

  const value = useMemo<ShiftValue>(
    () => ({
      loading,
      error,
      vehicle,
      route,
      events,
      certifiedDates,
      earliestDate,
      refresh,

      signOnToVehicle: async (vehicleId: string) => {
        if (!profile) throw new Error('Not signed in.');
        /*
         * The org and driver are not passed any more: the RPC reads them from
         * the session. Nothing optimistic here either — the truck either
         * changes or it does not, and showing the new truck before the write
         * landed would tell a driver they are on a vehicle a colleague is
         * sitting in.
         */
        await api.signOnToVehicle(vehicleId);
        await refresh();
      },

      changeStatus: async (status: DutyStatus) => {
        if (!profile) throw new Error('Not signed in.');

        /*
         * The time the driver tapped, not the time the write lands. The table
         * is append-only and stores no end time, so an event sent late is
         * still correct as long as its own start is right — which is what makes
         * this safe to queue when there is no signal.
         *
         * The local list is updated first so the buttons and graph move on
         * the tap, not after the radio round-trip. Waiting for the write was
         * why a driver hammered the same button three times.
         */
        const startedAt = new Date().toISOString();
        const optimistic: DutyEvent = {
          id: `local-${startedAt}`,
          status,
          startedAt,
          vehicleId: vehicle?.vehicleId ?? null,
          // A brand new event has nothing to correct.
          correction: null,
        };
        setEvents(current => [...current, optimistic]);

        try {
          await api.recordDutyEvent(
            profile.orgId,
            profile.driverId,
            status,
            startedAt,
            vehicle?.vehicleId ?? null,
          );
        } catch (err) {
          setEvents(current => current.filter(event => event.id !== optimistic.id));
          throw err;
        }

        refresh().catch(() => {});
      },

      certifyDay: async (date: string) => {
        if (!profile) throw new Error('Not signed in.');
        await api.certifyDay(profile.orgId, profile.driverId, date);
        /*
         * Applied locally as well as arriving over the socket a moment later.
         * The tick has to appear on the tap — a driver who sees nothing happen
         * presses again, and certifying is the one action where a second press
         * is a second signature.
         */
        setCertifiedDates(current => new Set([...current, date]));
      },
    }),
    [loading, error, vehicle, route, events, certifiedDates, earliestDate, refresh, profile],
  );

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
}

export function useShift(): ShiftValue {
  const ctx = useContext(ShiftContext);
  if (!ctx) throw new Error('useShift must be used inside <ShiftProvider>');
  return ctx;
}
