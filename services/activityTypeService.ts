import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const ACTIVITY_TYPES_CACHE_KEY = 'activity_types_cache';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface ActivityTypeDefinition {
  value: string;
  label: string;
  emoji: string;
}

interface CachedActivityTypes {
  activityTypes: ActivityTypeDefinition[];
  timestamp: number;
}

// Default activity types (fallback if backend unavailable)
const DEFAULT_ACTIVITY_TYPES: ActivityTypeDefinition[] = [
  { value: 'weight-training', label: 'Weight Training', emoji: '🏋️' },
  { value: 'calisthenics', label: 'Calisthenics', emoji: '💪' },
  { value: 'cardio', label: 'Cardio', emoji: '🏃' },
  { value: 'mobility', label: 'Mobility', emoji: '🧘' },
  { value: 'recovery', label: 'Recovery', emoji: '🛌' },
  { value: 'sports', label: 'Sports', emoji: '⚽' },
  { value: 'other', label: 'Other', emoji: '🎯' },
];

let memoryCache: ActivityTypeDefinition[] | null = null;

/**
 * Fetch activity types from the backend API
 */
async function fetchActivityTypesFromApi(): Promise<ActivityTypeDefinition[]> {
  const response = await fetch(`${API_URL}/api/activity-types`);
  if (!response.ok) {
    throw new Error('Failed to fetch activity types');
  }
  const data = await response.json();
  return data.activityTypes;
}

/**
 * Load activity types from AsyncStorage cache
 */
async function loadCachedActivityTypes(): Promise<ActivityTypeDefinition[] | null> {
  try {
    const cached = await AsyncStorage.getItem(ACTIVITY_TYPES_CACHE_KEY);
    if (!cached) return null;

    const { activityTypes, timestamp }: CachedActivityTypes = JSON.parse(cached);

    // Check if cache is still valid
    if (Date.now() - timestamp > CACHE_DURATION_MS) {
      return null;
    }

    return activityTypes;
  } catch {
    return null;
  }
}

/**
 * Save activity types to AsyncStorage cache
 */
async function saveActivityTypesToCache(activityTypes: ActivityTypeDefinition[]): Promise<void> {
  try {
    const cached: CachedActivityTypes = {
      activityTypes,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(ACTIVITY_TYPES_CACHE_KEY, JSON.stringify(cached));
  } catch (error) {
    console.error('Failed to cache activity types:', error);
  }
}

/**
 * Initialize activity types - call this on app startup
 * Fetches from API and caches, or uses cached/default version if available
 */
export async function initializeActivityTypes(): Promise<ActivityTypeDefinition[]> {
  // Return memory cache if available
  if (memoryCache) {
    return memoryCache;
  }

  // Try to load from persistent cache first
  const cached = await loadCachedActivityTypes();
  if (cached) {
    memoryCache = cached;
    // Refresh in background (don't await)
    refreshActivityTypesInBackground();
    return cached;
  }

  // Fetch from API
  try {
    const activityTypes = await fetchActivityTypesFromApi();
    memoryCache = activityTypes;
    await saveActivityTypesToCache(activityTypes);
    return activityTypes;
  } catch (error) {
    console.error('Failed to fetch activity types, using defaults:', error);
    // Use defaults as fallback
    memoryCache = DEFAULT_ACTIVITY_TYPES;
    return DEFAULT_ACTIVITY_TYPES;
  }
}

/**
 * Refresh activity types from API in the background
 */
async function refreshActivityTypesInBackground(): Promise<void> {
  try {
    const activityTypes = await fetchActivityTypesFromApi();
    memoryCache = activityTypes;
    await saveActivityTypesToCache(activityTypes);
  } catch {
    // Silently fail - we have cached data
  }
}

/**
 * Get cached activity types (must call initializeActivityTypes first)
 * Returns defaults if not initialized
 */
export function getActivityTypes(): ActivityTypeDefinition[] {
  return memoryCache || DEFAULT_ACTIVITY_TYPES;
}

/**
 * Get emoji for an activity type
 */
export function getEmojiForType(type: string): string {
  const activityTypes = getActivityTypes();
  const found = activityTypes.find(t => t.value === type);
  return found?.emoji || '🎯';
}

/**
 * Get activity type emojis as a record (for backwards compatibility)
 */
export function getActivityEmojis(): Record<string, string> {
  const activityTypes = getActivityTypes();
  return Object.fromEntries(activityTypes.map(t => [t.value, t.emoji]));
}

/**
 * Clear the activity types cache
 */
export async function clearActivityTypesCache(): Promise<void> {
  memoryCache = null;
  await AsyncStorage.removeItem(ACTIVITY_TYPES_CACHE_KEY);
}
