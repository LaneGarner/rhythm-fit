import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityType } from '../types/activity';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const EXERCISES_CACHE_KEY = 'exercises_cache';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface Exercise {
  name: string;
  type: ActivityType;
}

interface CachedExercises {
  exercises: Exercise[];
  timestamp: number;
}

let memoryCache: Exercise[] | null = null;

/**
 * Fetch exercises from the backend API
 */
async function fetchExercisesFromApi(): Promise<Exercise[]> {
  const response = await fetch(`${API_URL}/api/exercises`);
  if (!response.ok) {
    throw new Error('Failed to fetch exercises');
  }
  const data = await response.json();
  return data.exercises;
}

/**
 * Load exercises from AsyncStorage cache
 */
async function loadCachedExercises(): Promise<Exercise[] | null> {
  try {
    const cached = await AsyncStorage.getItem(EXERCISES_CACHE_KEY);
    if (!cached) return null;

    const { exercises, timestamp }: CachedExercises = JSON.parse(cached);

    // Check if cache is still valid
    if (Date.now() - timestamp > CACHE_DURATION_MS) {
      return null;
    }

    return exercises;
  } catch {
    return null;
  }
}

/**
 * Save exercises to AsyncStorage cache
 */
async function saveExercisesToCache(exercises: Exercise[]): Promise<void> {
  try {
    const cached: CachedExercises = {
      exercises,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(EXERCISES_CACHE_KEY, JSON.stringify(cached));
  } catch (error) {
    console.error('Failed to cache exercises:', error);
  }
}

/**
 * Initialize exercises - call this on app startup
 * Fetches from API and caches, or uses cached version if available
 */
export async function initializeExercises(): Promise<Exercise[]> {
  // Return memory cache if available
  if (memoryCache) {
    return memoryCache;
  }

  // Try to load from persistent cache first
  const cached = await loadCachedExercises();
  if (cached) {
    memoryCache = cached;
    // Refresh in background (don't await)
    refreshExercisesInBackground();
    return cached;
  }

  // Fetch from API
  try {
    const exercises = await fetchExercisesFromApi();
    memoryCache = exercises;
    await saveExercisesToCache(exercises);
    return exercises;
  } catch (error) {
    console.error('Failed to fetch exercises:', error);
    // Return empty array as fallback
    return [];
  }
}

/**
 * Refresh exercises from API in the background
 */
async function refreshExercisesInBackground(): Promise<void> {
  try {
    const exercises = await fetchExercisesFromApi();
    memoryCache = exercises;
    await saveExercisesToCache(exercises);
  } catch {
    // Silently fail - we have cached data
  }
}

/**
 * Get cached exercises (must call initializeExercises first)
 */
export function getExercises(): Exercise[] {
  return memoryCache || [];
}

/**
 * Find an exercise by name (case-insensitive)
 */
export function findExerciseByName(name: string): Exercise | undefined {
  const exercises = getExercises();
  const lowerName = name.toLowerCase();
  return exercises.find(e => e.name.toLowerCase() === lowerName);
}

/**
 * Search exercises by partial match
 */
export function searchExercises(query: string): Exercise[] {
  const exercises = getExercises();
  const lowerQuery = query.toLowerCase();
  return exercises.filter(e => e.name.toLowerCase().includes(lowerQuery));
}

/**
 * Get all exercise names
 */
export function getExerciseNames(): string[] {
  return getExercises().map(e => e.name);
}

/**
 * Clear the exercise cache (useful for testing or forcing refresh)
 */
export async function clearExerciseCache(): Promise<void> {
  memoryCache = null;
  await AsyncStorage.removeItem(EXERCISES_CACHE_KEY);
}
