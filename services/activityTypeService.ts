import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiEndpoint } from '../config/api';

const ACTIVITY_TYPES_CACHE_KEY = 'activity_types_cache_v3';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export type IoniconName = keyof typeof Ionicons.glyphMap;

export interface ActivityTypeDefinition {
  value: string;
  label: string;
  iconName: IoniconName;
}

interface CachedActivityTypes {
  activityTypes: ActivityTypeDefinition[];
  timestamp: number;
}

// Default activity types (fallback if backend unavailable)
const DEFAULT_ACTIVITY_TYPES: ActivityTypeDefinition[] = [
  {
    value: 'weight-training',
    label: 'Weight Training',
    iconName: 'barbell-outline',
  },
  { value: 'calisthenics', label: 'Calisthenics', iconName: 'body-outline' },
  { value: 'cardio', label: 'Cardio', iconName: 'pulse-outline' },
  { value: 'mobility', label: 'Mobility', iconName: 'color-filter-outline' },
  { value: 'recovery', label: 'Recovery', iconName: 'water-outline' },
  { value: 'sports', label: 'Sports', iconName: 'basketball-outline' },
  { value: 'other', label: 'Other', iconName: 'apps-outline' },
];

export const DEFAULT_ACTIVITY_ICON: IoniconName = 'fitness-outline';

let memoryCache: ActivityTypeDefinition[] | null = null;

async function fetchActivityTypesFromApi(): Promise<ActivityTypeDefinition[]> {
  const response = await fetch(getApiEndpoint('/api/activity-types'));
  if (!response.ok) {
    throw new Error('Failed to fetch activity types');
  }
  const data = await response.json();
  return data.activityTypes;
}

async function loadCachedActivityTypes(): Promise<
  ActivityTypeDefinition[] | null
> {
  try {
    const cached = await AsyncStorage.getItem(ACTIVITY_TYPES_CACHE_KEY);
    if (!cached) return null;

    const { activityTypes, timestamp }: CachedActivityTypes =
      JSON.parse(cached);

    if (Date.now() - timestamp > CACHE_DURATION_MS) {
      return null;
    }

    return activityTypes;
  } catch {
    return null;
  }
}

async function saveActivityTypesToCache(
  activityTypes: ActivityTypeDefinition[]
): Promise<void> {
  try {
    const cached: CachedActivityTypes = {
      activityTypes,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(
      ACTIVITY_TYPES_CACHE_KEY,
      JSON.stringify(cached)
    );
  } catch (error) {
    console.error('Failed to cache activity types:', error);
  }
}

/**
 * Initialize activity types - call this on app startup
 * Fetches from API and caches, or uses cached/default version if available
 */
export async function initializeActivityTypes(): Promise<
  ActivityTypeDefinition[]
> {
  if (memoryCache) {
    return memoryCache;
  }

  const cached = await loadCachedActivityTypes();
  if (cached) {
    memoryCache = cached;
    refreshActivityTypesInBackground();
    return cached;
  }

  try {
    const activityTypes = await fetchActivityTypesFromApi();
    memoryCache = activityTypes;
    await saveActivityTypesToCache(activityTypes);
    return activityTypes;
  } catch (error) {
    console.error('Failed to fetch activity types, using defaults:', error);
    memoryCache = DEFAULT_ACTIVITY_TYPES;
    return DEFAULT_ACTIVITY_TYPES;
  }
}

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
 * Get Ionicon name for an activity type, falling back to a generic fitness icon.
 */
export function getIconForType(type?: string | null): IoniconName {
  if (!type) return DEFAULT_ACTIVITY_ICON;
  const found = getActivityTypes().find(t => t.value === type);
  return found?.iconName || DEFAULT_ACTIVITY_ICON;
}

export async function clearActivityTypesCache(): Promise<void> {
  memoryCache = null;
  await AsyncStorage.removeItem(ACTIVITY_TYPES_CACHE_KEY);
}
