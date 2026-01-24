import Constants from 'expo-constants';

// Legacy OpenAI config - still used for local/offline mode
export const OPENAI_CONFIG = {
  apiKey:
    (Constants.expoConfig?.extra?.OPENAI_API_KEY as string | undefined) ||
    (process.env.EXPO_PUBLIC_OPENAI_API_KEY as string | undefined) ||
    '',
  dangerouslyAllowBrowser: true,
};

// Backend API configuration
export const API_URL =
  (Constants.expoConfig?.extra?.API_URL as string | undefined) ||
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  '';

// Supabase configuration
export const SUPABASE_URL =
  (Constants.expoConfig?.extra?.SUPABASE_URL as string | undefined) ||
  (process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined) ||
  '';

export const SUPABASE_ANON_KEY =
  (Constants.expoConfig?.extra?.SUPABASE_ANON_KEY as string | undefined) ||
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
  '';

// Check if backend is configured
export function isBackendConfigured(): boolean {
  return Boolean(API_URL && SUPABASE_URL && SUPABASE_ANON_KEY);
}
