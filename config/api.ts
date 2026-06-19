import Constants from 'expo-constants';

export class BackendConfigurationError extends Error {
  constructor() {
    super('Backend API URL is not configured');
    this.name = 'BackendConfigurationError';
  }
}

// Backend API configuration
export const API_URL =
  (Constants.expoConfig?.extra?.API_URL as string | undefined) ||
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  '';

export function getApiUrl(): string {
  if (!API_URL) {
    throw new BackendConfigurationError();
  }
  return API_URL;
}

export function getApiEndpoint(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiUrl()}${normalizedPath}`;
}

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
  return Boolean(API_URL);
}

export function getBackendConfigErrorMessage(): string {
  return 'The coach and sync server is not configured for this build.';
}
