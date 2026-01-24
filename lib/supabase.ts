import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl =
  (Constants.expoConfig?.extra?.SUPABASE_URL as string | undefined) ||
  (process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined) ||
  '';

const supabaseAnonKey =
  (Constants.expoConfig?.extra?.SUPABASE_ANON_KEY as string | undefined) ||
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
  '';

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Helper to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
