import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * The Supabase client. Auth tokens persist in AsyncStorage (proper native storage — no
 * browser/localStorage APIs, per the engineering guardrails).
 *
 * The client is intentionally untyped here; `src/lib/api.ts` is the single typed boundary —
 * every function there declares explicit row return types (see database.types.ts), so screens
 * get full type safety without fighting supabase-js's generic write-payload inference.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
