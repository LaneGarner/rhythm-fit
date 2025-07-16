import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExerciseDefinition } from '../constants/exercises';
import { Activity } from '../types/activity';

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

// Custom exercise storage functions
export const saveCustomExercises = async (exercises: ExerciseDefinition[]) => {
  try {
    await AsyncStorage.setItem('customExercises', JSON.stringify(exercises));
  } catch (error) {
    console.error('Error saving custom exercises:', error);
  }
};

export const loadCustomExercises = async (): Promise<ExerciseDefinition[]> => {
  try {
    const data = await AsyncStorage.getItem('customExercises');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading custom exercises:', error);
    return [];
  }
};

export const addCustomExercise = async (
  exercise: ExerciseDefinition
): Promise<void> => {
  try {
    const existingExercises = await loadCustomExercises();
    const updatedExercises = [...existingExercises, exercise];
    await saveCustomExercises(updatedExercises);
  } catch (error) {
    console.error('Error adding custom exercise:', error);
  }
};

export const getAllExercises = async (): Promise<ExerciseDefinition[]> => {
  try {
    const customExercises = await loadCustomExercises();
    // Import the base exercise database dynamically to avoid circular imports
    const { EXERCISE_DATABASE } = await import('../constants/exercises');
    return [...EXERCISE_DATABASE, ...customExercises];
  } catch (error) {
    console.error('Error loading all exercises:', error);
    return [];
  }
};
