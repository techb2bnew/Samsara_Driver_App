/**
 * The barrel deliberately does NOT re-export the api module.
 *
 * `export * as api from './api'` needs @babel/plugin-transform-export-namespace-from,
 * which Metro's preset does not include — it typechecks and then fails at
 * bundle time. Screens import the api directly instead:
 *
 *   import * as api from '../../supabase/api';
 */
export { supabase } from './client';
export type { Database, Json } from './database';
