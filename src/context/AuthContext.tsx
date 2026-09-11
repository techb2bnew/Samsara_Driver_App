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

/**
 * The last profile that loaded, kept so a failed read is not a broken app.
 *
 * The profile is the office's answer to "who is this driver" — their depot,
 * their timezone, their fleet's hours rule book. It changes about as often as
 * somebody changes job, and the app cannot draw a single screen without it.
 *
 * So it is cached. A phone in a yard with no signal opens to the app it opened
 * to yesterday, rather than to a screen explaining that the request failed —
 * which is the same thing every other part of this app does with a stale read,
 * and the only reason it did not here was that nothing kept the last answer.
 */
const PROFILE_KEY = 'samsara.driver.profile.v1';

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
      if (profile) {
        setState({ status: 'signedIn', profile });
        AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile)).catch(() => {});
      } else {
        /*
         * A real answer: this account has no driver row. Cached anything is
         * wrong now, so it goes — otherwise an office login that once opened
         * the app would keep opening it.
         */
        AsyncStorage.removeItem(PROFILE_KEY).catch(() => {});
        setState({ status: 'notADriver' });
      }
    } catch {
      /*
       * The read failed — almost always no signal. The session is still real,
       * so the driver stays signed in on the last profile that loaded and the
       * app opens normally.
       *
       * There is no third screen for this. An app that works and a sign-in
       * screen are the two outcomes; "your account is not set up as a driver,
       * ask your fleet office" was a third, and it was wrong twice over — the
       * account was fine, and the office could do nothing about a dropped
       * request.
       *
       * With nothing cached there is nothing to open the app with, and
       * sign-in is the honest place to land: signing in fetches the profile as
       * part of doing so. That only happens on a phone that has never
       * completed a load, which took a network to reach in the first place.
       */
      let cached: string | null = null;
      try {
        cached = await AsyncStorage.getItem(PROFILE_KEY);
      } catch {
        // Storage unavailable. Treated as no cache.
      }

      if (cached) {
        try {
          setState({ status: 'signedIn', profile: JSON.parse(cached) as DriverProfile });
          return;
        } catch {
          // Unreadable, from an older shape. Fall through to sign-in.
        }
      }
      setState({ status: 'signedOut' });
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
        /* The next person to hold this phone is not this driver. */
        AsyncStorage.removeItem(PROFILE_KEY).catch(() => {});
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
