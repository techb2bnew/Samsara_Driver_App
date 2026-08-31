import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@env';
import type { Database } from './database';

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Supabase config missing. Copy .env.example to .env and fill in ' +
      'SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.',
  );
}

/**
 * React Native client.
 *
 * storage: AsyncStorage keeps the session on the device, so a driver stays
 *   signed in between app launches and after a restart in a dead zone.
 * detectSessionInUrl: false because there is no browser URL in a native app.
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
