import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import * as api from '../supabase/api';
import type { DriverProfile } from '../supabase/api';

/**
 * Who is signed in, and which driver they are.
 *
 * Two separate questions, and the app needs both. Supabase answers the first;
 * the second is a row in `drivers` linked by user_id, and an account can exist
 * without it — an office login on the driver app, or an invitation that
 * half-finished. That case gets its own state so the sign-in screen can say so
 * instead of dropping someone into an app with no data.
 *
 * Onboarding is remembered on the device rather than on the account: it is
 * about this phone having been introduced to the app, not about the person.
 */

const ONBOARDED_KEY = 'samsara.driver.onboarded.v2';

type State =
  | { status: 'loading' }
  | { status: 'signedOut' }
  /** Signed in, but the account is not linked to a driver. */
  | { status: 'notADriver' }
  | { status: 'signedIn'; profile: DriverProfile };

type AuthValue = {
  state: State;
  /** False until this phone has been through onboarding once. */
  onboarded: boolean | null;
  completeOnboarding: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY)
      .then(value => setOnboarded(value === 'true'))
      // A device that cannot read storage should still be usable; showing
      // onboarding again is the harmless direction.
      .catch(() => setOnboarded(false));
  }, []);

  const resolve = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setState({ status: 'signedOut' });
      return;
    }
    try {
      const profile = await api.loadProfile();
      setState(profile ? { status: 'signedIn', profile } : { status: 'notADriver' });
    } catch {
      // The session is real but the profile read failed — almost always no
      // network on launch. Treated as signed in with no profile rather than
      // signed out, because signing the driver out would lose queued work.
      setState({ status: 'notADriver' });
    }
  }, []);

  useEffect(() => {
    resolve();

    /*
     * Supabase refreshes the token in the background and fires here. Only the
     * events that change WHO is signed in are acted on: TOKEN_REFRESHED fires
     * on a timer and re-resolving the profile on each one would re-query the
     * database every hour for no reason.
     */
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        resolve();
      }
    });

    /*
     * Re-read on return to the foreground.
     *
     * The profile carries things the OFFICE owns: the depot, the timezone, and
     * the hours rule book the whole HOS strip is calculated from. Read once at
     * sign-in and never again, so an office that chose FMCSA on Tuesday
     * changed nothing on a phone that had been signed in since Monday — the
     * driver's remaining-hours clocks stayed dashes and nothing anywhere
     * explained why. Signing out and back in was the only cure, and nobody
     * would guess it.
     *
     * Coming back to the app is the natural moment: one query, and it covers
     * the case that actually happens — a setting changed while the phone was
     * in a pocket. Not a socket subscription, because a rule book changes
     * about once a year.
     */
    const app = AppState.addEventListener('change', (next) => {
      if (next === 'active') resolve();
    });

    return () => {
      sub.subscription.unsubscribe();
      app.remove();
    };
  }, [resolve]);

  const value = useMemo<AuthValue>(
    () => ({
      state,
      onboarded,
      completeOnboarding: async () => {
        setOnboarded(true);
        try {
          await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
        } catch {
          // Shown again next launch. Not worth blocking the driver over.
        }
      },
      signIn: async (email, password) => {
        await api.signIn(email, password);
        await resolve();
      },
      signOut: async () => {
        await api.signOut();
        setState({ status: 'signedOut' });
      },
      refreshProfile: resolve,
    }),
    [state, onboarded, resolve],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
