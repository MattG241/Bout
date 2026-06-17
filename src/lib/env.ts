import Constants from 'expo-constants';

/**
 * App configuration sourced from app.json `extra` (and overridable by EAS env at build
 * time). No secrets beyond the public anon key live here; the service role key is
 * server-only.
 */
const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

export const env = {
  supabaseUrl: extra.supabaseUrl ?? '',
  supabaseAnonKey: extra.supabaseAnonKey ?? '',
  revenueCatApiKeyIos: extra.revenueCatApiKeyIos ?? '',
  revenueCatApiKeyAndroid: extra.revenueCatApiKeyAndroid ?? '',
};

export const isConfigured = env.supabaseUrl.startsWith('http') && env.supabaseAnonKey.length > 0;
