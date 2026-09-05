import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as api from '../supabase/api';
import { useAuth } from './AuthContext';

/**
 * The driver's own preferences, held once for the whole app.
 *
 * Two places need them and they must not disagree: the Settings screen, which
 * changes them, and the notification logic, which obeys them. Loaded twice
 * they would drift — a driver could turn the break reminder off and keep being
 * reminded until the app was restarted.
 *
 * Sits above NotificationProvider for that reason.
 */

type SettingsValue = {
  settings: api.DriverSettings;
  loading: boolean;
  error: string | null;
  /** Applied on the spot, then written. Puts the old value back if it fails. */
  save: (patch: Partial<api.DriverSettings>) => Promise<void>;
};

/*
 * The same defaults the API returns for a driver with no row. Repeated here
 * rather than left undefined so nothing renders an empty switch while the
 * first load is in flight.
 */
const DEFAULTS: api.DriverSettings = {
  distanceUnit: 'km',
  notifyPush: true,
  notifyEmail: false,
  notifyBreakReminder: true,
};

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const profile = state.status === 'signedIn' ? state.profile : null;

  const [settings, setSettings] = useState<api.DriverSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .loadMySettings(profile.driverId)
      .then(next => {
        if (!cancelled) setSettings(next);
      })
      .catch(() => {
        // Defaults stand. A driver who cannot load their preferences should
        // still get an app that works, with the sensible ones.
        if (!cancelled) setError('settings');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const save = useCallback(
    async (patch: Partial<api.DriverSettings>) => {
      if (!profile) return;
      const previous = settings;
      const next = { ...settings, ...patch };

      // Moved on the tap, not after the round trip. A switch that waits for
      // the network feels broken in a cab with one bar.
      setSettings(next);
      setError(null);
      try {
        await api.saveMySettings(profile.orgId, profile.driverId, next);
      } catch (cause) {
        setSettings(previous);
        throw cause;
      }
    },
    [profile, settings],
  );

  const value = useMemo<SettingsValue>(
    () => ({ settings, loading, error, save }),
    [settings, loading, error, save],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
