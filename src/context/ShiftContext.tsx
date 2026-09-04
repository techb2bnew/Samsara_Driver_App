import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as api from '../supabase/api';
import type { DutyEvent, DutyStatus } from '../supabase/api';
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

      const [current, dutyEvents, logs] = await Promise.all([
        api.loadCurrentVehicle(profile.driverId),
        api.loadDutyEvents(profile.driverId, from.toISOString(), to.toISOString()),
        api.loadDailyLogs(profile.driverId, isoDate(from), isoDate(new Date())),
      ]);

      setVehicle(current);
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

  const value = useMemo<ShiftValue>(
    () => ({
      loading,
      error,
      vehicle,
      events,
      certifiedDates,
      earliestDate,
      refresh,

      signOnToVehicle: async (vehicleId: string) => {
        if (!profile) throw new Error('Not signed in.');
        await api.signOnToVehicle(profile.orgId, profile.driverId, vehicleId);
        await refresh();
      },

      changeStatus: async (status: DutyStatus) => {
        if (!profile) throw new Error('Not signed in.');

        /*
         * The time the driver tapped, not the time the write lands. The table
         * is append-only and stores no end time, so an event sent late is
         * still correct as long as its own start is right — which is what makes
         * this safe to queue when there is no signal.
         */
        const startedAt = new Date().toISOString();

        await api.recordDutyEvent(
          profile.orgId,
          profile.driverId,
          status,
          startedAt,
          vehicle?.vehicleId ?? null,
        );
        await refresh();
      },

      certifyDay: async (date: string) => {
        if (!profile) throw new Error('Not signed in.');
        await api.certifyDay(profile.orgId, profile.driverId, date);
        setCertifiedDates(current => new Set([...current, date]));
      },
    }),
    [loading, error, vehicle, events, certifiedDates, earliestDate, refresh, profile],
  );

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
}

export function useShift(): ShiftValue {
  const ctx = useContext(ShiftContext);
  if (!ctx) throw new Error('useShift must be used inside <ShiftProvider>');
  return ctx;
}
