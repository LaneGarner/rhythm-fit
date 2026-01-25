import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { Activity } from '../types/activity';
import { clearLibraryCache } from '../services/libraryService';

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
      clearThemeMode(),
    ]);
  } catch (error) {
    console.error('Error clearing all app data:', error);
  }
};

// Generate random activities for a specific week (dev mode)
export const generateRandomWeekActivities = (
  weekOffset: number = 0
): Activity[] => {
  const activities: Activity[] = [];

  // Use dayjs for reliable date calculations
  const today = dayjs();
  const targetWeek = today.add(weekOffset, 'week');

  // Get Monday of the target week (Monday-Sunday week model)
  // dayjs startOf('week') uses Sunday as start, so we need to calculate Monday properly
  const dayOfWeek = targetWeek.day(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // For Monday-Sunday week: go back to Monday
  // Sunday (0) -> go back 6 days, Monday (1) -> go back 0 days, Tuesday (2) -> go back 1 day, etc.
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = targetWeek.subtract(daysToSubtract, 'day').startOf('day');

  // Sample exercises by category
  const weightTrainingExercises = [
    'Bench Press',
    'Squat',
    'Deadlift',
    'Overhead Press',
    'Bent Over Row',
    'Dumbbell Curl',
    'Tricep Extension',
    'Lat Pulldown',
    'Lunge',
    'Hip Thrust',
    'Calf Raise',
    'Lateral Raise',
    'Leg Extension',
    'Leg Curl',
  ];

  const calisthenicsExercises = [
    'Push-Up',
    'Pull-Up',
    'Plank',
    'Dip',
    'Burpee',
    'Mountain Climber',
    'Jumping Jack',
    'Handstand Push-Up',
    'Pistol Squat',
    'L-Sit',
  ];

  const cardioExercises = [
    'Running',
    'Cycling',
    'Swimming',
    'Rowing',
    'Jump Rope',
    'Elliptical',
    'HIIT',
    'Stair Climber',
  ];

  const mobilityExercises = [
    'Yoga',
    'Sun Salutation',
    'Downward Dog',
    'Pigeon Pose',
    'Hip Flexor Stretch',
    'Hamstring Stretch',
    'Shoulder Stretch',
  ];

  const recoveryExercises = [
    'Foam Rolling',
    'Stretching',
    'Meditation',
    'Walking',
    'Sauna',
  ];

  const sportsExercises = [
    'Basketball',
    'Soccer',
    'Tennis',
    'Golf',
    'Volleyball',
    'Rock Climbing',
    'Boxing',
    'Hiking',
  ];

  // Exercise categories with their types and emojis
  const exerciseCategories = [
    {
      exercises: weightTrainingExercises,
      type: 'weight-training' as const,
      emoji: '🏋️',
    },
    {
      exercises: calisthenicsExercises,
      type: 'calisthenics' as const,
      emoji: '💪',
    },
    { exercises: cardioExercises, type: 'cardio' as const, emoji: '🏃' },
    { exercises: mobilityExercises, type: 'mobility' as const, emoji: '🧘' },
    { exercises: recoveryExercises, type: 'recovery' as const, emoji: '🛌' },
    { exercises: sportsExercises, type: 'sports' as const, emoji: '⚽' },
  ];

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
      } while (usedExercises.has(exercise) && attempts < 20); // Try up to 20 times to find unique exercise

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
