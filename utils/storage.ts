import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { Activity } from '../types/activity';
import { getMondayOfWeekByOffset } from './dateUtils';
import { clearLibraryCache } from '../services/libraryService';
import { clearExerciseCache, getExercises } from '../services/exerciseService';
import {
  getActivityTypes,
  clearActivityTypesCache,
} from '../services/activityTypeService';
import { clearEmojiLibraryCache } from '../services/emojiLibraryService';
import { clearEquipmentCache } from '../services/equipmentService';

// Activity storage functions
export const saveActivities = async (activities: Activity[]) => {
  try {
    await AsyncStorage.setItem('activities', JSON.stringify(activities));
  } catch (error) {
    console.error('Error saving activities:', error);
  }
};

export const loadActivities = async (): Promise<Activity[]> => {
  try {
    const data = await AsyncStorage.getItem('activities');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading activities:', error);
    return [];
  }
};

// Theme storage functions
export const saveThemeMode = async (themeMode: string) => {
  try {
    await AsyncStorage.setItem('themeMode', themeMode);
  } catch (error) {
    console.error('Error saving theme mode:', error);
  }
};

export const loadThemeMode = async (): Promise<string> => {
  try {
    const data = await AsyncStorage.getItem('themeMode');
    return data || 'light';
  } catch (error) {
    console.error('Error loading theme mode:', error);
    return 'light';
  }
};

export function toTitleCase(str: string): string {
  return str.replace(
    /\w\S*/g,
    txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

// Clear all data functions
export const clearAllActivities = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('activities');
  } catch (error) {
    console.error('Error clearing activities:', error);
  }
};

export const clearChatHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('chat_history');
  } catch (error) {
    console.error('Error clearing chat history:', error);
  }
};

export const clearThemeMode = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('themeMode');
  } catch (error) {
    console.error('Error clearing theme mode:', error);
  }
};

export const clearAllAppData = async (): Promise<void> => {
  try {
    await Promise.all([
      clearAllActivities(),
      clearChatHistory(),
      clearLibraryCache(),
      clearExerciseCache(),
      clearActivityTypesCache(),
      clearThemeMode(),
    ]);
  } catch (error) {
    console.error('Error clearing all app data:', error);
  }
};

// Clear user-specific data on sign out
// Preserves: exercises cache, activity types cache, theme (not user-specific)
export const clearUserData = async (): Promise<void> => {
  try {
    // Get all keys to find chat_history_* keys (user-specific chat histories)
    const allKeys = await AsyncStorage.getAllKeys();
    const chatHistoryKeys = allKeys.filter(key =>
      key.startsWith('chat_history')
    );

    await Promise.all([
      clearAllActivities(),
      clearLibraryCache(),
      clearEmojiLibraryCache(),
      clearEquipmentCache(),
      AsyncStorage.multiRemove(chatHistoryKeys),
    ]);
  } catch (error) {
    console.error('Error clearing user data:', error);
  }
};

// Generate random activities for a specific week (dev mode)
// Uses cached exercises and activity types from backend
export const generateRandomWeekActivities = (
  weekOffset: number = 0
): Activity[] => {
  const activities: Activity[] = [];

  // Get Monday of the target week
  const startOfWeek = getMondayOfWeekByOffset(weekOffset);

  // Get exercises and activity types from cache
  const allExercises = getExercises();
  const activityTypes = getActivityTypes();

  // Group exercises by type
  const exercisesByType = new Map<string, string[]>();
  for (const exercise of allExercises) {
    const existing = exercisesByType.get(exercise.type) || [];
    existing.push(exercise.name);
    exercisesByType.set(exercise.type, existing);
  }

  // Build categories from cached data
  const exerciseCategories = activityTypes
    .filter(at => exercisesByType.has(at.value)) // Only include types that have exercises
    .map(at => ({
      exercises: exercisesByType.get(at.value) || [],
      type: at.value as Activity['type'],
      emoji: at.emoji,
    }));

  // Fallback if no cached data available
  if (exerciseCategories.length === 0) {
    console.warn(
      'No cached exercises/types available for test data generation'
    );
    return [];
  }

  // Track used exercises to ensure uniqueness within the week
  const usedExercises = new Set<string>();

  // Generate 2-4 activities per day for the week (Monday to Sunday)
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const currentDate = startOfWeek.add(dayOffset, 'day');
    const dateString = currentDate.format('YYYY-MM-DD');

    // Random number of activities per day (2-4, with some days having fewer)
    const numActivities =
      Math.random() < 0.3 ? 1 : Math.floor(Math.random() * 3) + 2;

    for (let i = 0; i < numActivities; i++) {
      // Choose random category
      const category =
        exerciseCategories[
          Math.floor(Math.random() * exerciseCategories.length)
        ];

      // Find an unused exercise from this category
      let exercise: string;
      let attempts = 0;
      do {
        exercise =
          category.exercises[
            Math.floor(Math.random() * category.exercises.length)
          ];
        attempts++;
      } while (usedExercises.has(exercise) && attempts < 20);

      // If we couldn't find a unique exercise after 20 attempts, allow duplicates
      if (attempts < 20) {
        usedExercises.add(exercise);
      }

      const activity: Activity = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        date: dateString,
        type: category.type,
        name: exercise,
        emoji: category.emoji,
        completed: Math.random() < 0.3, // 30% chance already completed
        notes: `Sample activity generated for testing - Week ${weekOffset === 0 ? '(current)' : weekOffset > 0 ? `+${weekOffset}` : weekOffset}`,
      };

      activities.push(activity);
    }
  }

  return activities;
};
