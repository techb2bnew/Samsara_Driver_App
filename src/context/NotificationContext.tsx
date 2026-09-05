import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../supabase/api';
import { notifications as t } from '../constans/Constants';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import { useShift } from './ShiftContext';
import { currentStatus, segmentsForDay } from '../helpers/duty';
import { drivingSinceBreak, limitsFor, regulatorFrom } from '../helpers/hosLimits';

/**
 * What the driver has not seen yet.
 *
 * Nothing is stored server-side, on purpose. A notification here is derived
 * from something that already exists — a message row, a route row, an
 * assignment row — so a notifications table would be a second copy of facts
 * that can drift from the first. The only thing that genuinely belongs to the
 * phone is which ones have been LOOKED at, and that lives in AsyncStorage.
 *
 * ---------------------------------------------------------------------------
 * What this is NOT
 * ---------------------------------------------------------------------------
 * This wakes nothing. It works while the app is running — foreground, or warm
 * in the background — and that is the limit of what JavaScript can do. A
 * notification that reaches a locked phone has to come from APNs or FCM, which
 * needs credentials and a server to send them. `driver_devices.push_token` is
 * where that will hook in; see the README note.
 */

export type DriverNotification = {
  /** Stable, so a reload does not resurrect a dismissed one. */
  id: string;
  kind: 'message' | 'route' | 'vehicle' | 'break';
  title: string;
  body: string;
  at: string;
};

type NotificationValue = {
  items: DriverNotification[];
  unreadCount: number;
  unreadIds: ReadonlySet<string>;
  /** Unread messages from the office, for the Messages tab badge. */
  unreadMessages: number;
  markAllRead: () => void;
  refresh: () => void;
};

const NotificationContext = createContext<NotificationValue | null>(null);

const SEEN_KEY = 'samsara.driver.seenNotifications';
/** Enough to be useful, small enough that AsyncStorage stays quick. */
const KEEP = 40;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const profile = state.status === 'signedIn' ? state.profile : null;
  const { settings } = useSettings();
  const { events } = useShift();

  const [items, setItems] = useState<DriverNotification[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());

  /*
   * What the last subscription callback saw. Realtime says "something in
   * routes changed", not what — so the previous state is what turns an event
   * into a sentence: a new reference is a new route, the same reference is a
   * change to it, and a different vehicle is a truck swap.
   */
  const lastRoute = useRef<string | null>(null);
  const lastVehicle = useRef<string | null>(null);
  const primed = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY)
      .then(raw => setSeen(new Set(raw ? (JSON.parse(raw) as string[]) : [])))
      .catch(() => setSeen(new Set()));
  }, []);

  const push = useCallback((next: DriverNotification) => {
    setItems(current =>
      current.some(i => i.id === next.id) ? current : [next, ...current].slice(0, KEEP),
    );
  }, []);

  /*
   * The break reminder.
   *
   * The one setting on that screen that does something today. Push needs a
   * Firebase project the fleet does not have yet, and the email preference is
   * the office's to act on — this one is entirely the app's, and it is the one
   * that stops a driver losing a day to an hours violation.
   *
   * Fired at two points, not continuously: half an hour out, and once the
   * limit has passed. The id carries which, so each is pushed once and a
   * driver is not told the same thing every minute — `push` refuses an id it
   * already holds.
   *
   * Only while actually driving. A reminder that arrives during the break the
   * driver is already taking is noise, and noise is what gets a notification
   * list ignored.
   */
  useEffect(() => {
    if (!profile || !settings.notifyBreakReminder) return;

    const book = regulatorFrom(profile.regulator);
    if (!book) return;

    const active = currentStatus(events);
    if (active?.status !== 'driving') return;

    const now = new Date();
    const limits = limitsFor(book);
    const driven = drivingSinceBreak(segmentsForDay(events, now, now), limits);
    const left = limits.drivingBeforeBreak - driven;

    /*
     * Keyed by the day and the stage, so tomorrow warns again and today does
     * not. Not keyed by the minute — that would push a new row every tick.
     */
    const day = now.toISOString().slice(0, 10);

    if (left <= 0) {
      push({
        id: `break-over-${day}`,
        kind: 'break',
        title: t.breakOverdue,
        body: t.breakOverdueBody(limits.breakLength),
        at: now.toISOString(),
      });
      return;
    }

    if (left <= 30) {
      push({
        id: `break-soon-${day}`,
        kind: 'break',
        title: t.breakDue,
        body: t.breakDueBody(Math.round(left), limits.breakLength),
        at: now.toISOString(),
      });
    }
  }, [profile, settings.notifyBreakReminder, events, push]);

  /** Message count, and the badge that hangs off it. */
  const refreshMessages = useCallback(async () => {
    if (!profile) return;
    try {
      const count = await api.unreadMessageCount(profile.driverId);
      setUnreadMessages(count);
      if (count > 0) {
        /*
         * One entry for "you have unread messages", keyed by the count. A
         * separate row per message would bury the other kinds — twelve
         * messages is one thing to go and read, not twelve things to dismiss.
         */
        push({
          id: `message-${count}`,
          kind: 'message',
          title: t.newMessage,
          body: t.newMessageBody,
          at: new Date().toISOString(),
        });
      }
    } catch {
      // A count is not worth surfacing an error over.
    }
  }, [profile, push]);

  const refreshRoute = useCallback(async () => {
    if (!profile) return;
    try {
      const route = await api.loadMyRoute(profile.driverId);
      const reference = route?.reference ?? null;

      // The first pass after sign-in establishes what "already known" means.
      // Without it every launch would announce the route they have had for days.
      if (!primed.current) {
        lastRoute.current = reference;
        return;
      }

      if (reference && reference !== lastRoute.current) {
        push({
          id: `route-${route!.id}-${reference}`,
          kind: 'route',
          title: lastRoute.current === null ? t.newRoute : t.routeChanged,
          body:
            lastRoute.current === null
              ? t.newRouteBody(reference)
              : t.routeChangedBody(reference),
          at: new Date().toISOString(),
        });
      }
      lastRoute.current = reference;
    } catch {
      // Left alone. The Route tab reports its own failures.
    }
  }, [profile, push]);

  const refreshVehicle = useCallback(async () => {
    if (!profile) return;
    try {
      const current = await api.loadCurrentVehicle(profile.driverId);
      const id = current?.vehicleId ?? null;

      if (!primed.current) {
        lastVehicle.current = id;
        return;
      }

      // Only when it actually changed. The subscription also fires for the
      // driver's own pick, and telling them what they just did is noise.
      if (id !== lastVehicle.current) {
        push(
          id
            ? {
                id: `vehicle-${current!.assignmentId}`,
                kind: 'vehicle',
                title: t.vehicleChanged,
                body: t.vehicleChangedBody(current!.name),
                at: new Date().toISOString(),
              }
            : {
                id: `vehicle-cleared-${Date.now()}`,
                kind: 'vehicle',
                title: t.vehicleCleared,
                body: t.vehicleClearedBody,
                at: new Date().toISOString(),
              },
        );
      }
      lastVehicle.current = id;
    } catch {
      // Duty reports its own failures.
    }
  }, [profile, push]);

  const refresh = useCallback(() => {
    refreshMessages();
    refreshRoute();
    refreshVehicle();
  }, [refreshMessages, refreshRoute, refreshVehicle]);

  /** First pass: learn the current state without announcing it. */
  useEffect(() => {
    if (!profile) {
      primed.current = false;
      lastRoute.current = null;
      lastVehicle.current = null;
      setItems([]);
      setUnreadMessages(0);
      return;
    }
    let cancelled = false;
    (async () => {
      await Promise.all([refreshRoute(), refreshVehicle()]);
      if (cancelled) return;
      primed.current = true;
      // Messages are counted after priming, because an unread message from
      // before the app opened IS something the driver should be told about.
      refreshMessages();
    })();
    return () => {
      cancelled = true;
    };
  }, [profile, refreshRoute, refreshVehicle, refreshMessages]);

  useEffect(() => {
    if (!profile) return;
    const stop = [
      api.onMessagesChanged(profile.driverId, refreshMessages),
      api.onMyRoutesChanged(profile.driverId, refreshRoute),
      api.onMyAssignmentChanged(profile.driverId, refreshVehicle),
    ];
    return () => stop.forEach(off => off());
  }, [profile, refreshMessages, refreshRoute, refreshVehicle]);

  const value = useMemo<NotificationValue>(() => {
    const unread = items.filter(i => !seen.has(i.id));
    return {
      items,
      unreadCount: unread.length,
      unreadIds: new Set(unread.map(i => i.id)),
      unreadMessages,
      markAllRead: () => {
        const next = new Set([...seen, ...items.map(i => i.id)]);
        setSeen(next);
        AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...next].slice(-200))).catch(() => {});
      },
      refresh,
    };
  }, [items, seen, unreadMessages, refresh]);

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationProvider>');
  return ctx;
}
