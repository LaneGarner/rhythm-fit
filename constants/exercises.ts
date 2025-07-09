// Exercise database with comprehensive metadata for LLM understanding
// Reuses existing types from types/activity.ts and constants/index.ts

import { ActivityType } from '../types/activity';

export interface ExerciseDefinition {
  name: string;
  type: ActivityType;
  category: ExerciseCategory;
  muscleGroups: MuscleGroup[];
  equipment?: Equipment[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description?: string;
  variations?: string[];
}

export type ExerciseCategory =
  | 'Compound'
  | 'Isolation'
  | 'Cardiovascular'
  | 'Flexibility'
  | 'Balance'
  | 'Plyometric'
  | 'Core'
  | 'Calisthenics'
  | 'Strength'
  | 'Endurance'
  | 'Recovery';

export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Forearms'
  | 'Core'
  | 'Lower Back'
  | 'Glutes'
  | 'Quadriceps'
  | 'Hamstrings'
  | 'Calves'
  | 'Full Body'
  | 'Cardiovascular'
  | 'Arms';

export type Equipment =
  | 'Barbell'
  | 'Dumbbell'
  | 'Kettlebell'
  | 'Cable Machine'
  | 'Smith Machine'
  | 'Resistance Band'
  | 'Bodyweight'
  | 'Treadmill'
  | 'Bike'
  | 'Rower'
  | 'Elliptical'
  | 'Medicine Ball'
  | 'TRX'
  | 'Foam Roller'
  | 'Yoga Mat'
  | 'Jump Rope'
  | 'None';

export const EXERCISE_DATABASE: ExerciseDefinition[] = [
  // Compound Strength Exercises
  {
    name: 'Bench Press',
    type: 'weight-training',
    category: 'Compound',
    muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
    equipment: ['Barbell', 'Dumbbell'],
    difficulty: 'Intermediate',
    description: 'Classic compound movement for chest development',
    variations: [
      'Incline Bench Press',
      'Decline Bench Press',
      'Dumbbell Bench Press',
    ],
  },
  {
    name: 'Overhead Press',
    type: 'weight-training',
    category: 'Compound',
    muscleGroups: ['Shoulders', 'Triceps'],
    equipment: ['Barbell', 'Dumbbell'],
    difficulty: 'Intermediate',
    description: 'Vertical pressing movement for shoulder strength',
    variations: ['Military Press', 'Push Press', 'Arnold Press'],
  },
  {
    name: 'Deadlift',
    type: 'weight-training',
    category: 'Compound',
    muscleGroups: ['Back', 'Glutes', 'Hamstrings', 'Lower Back'],
    equipment: ['Barbell', 'Dumbbell'],
    difficulty: 'Advanced',
    description: 'Fundamental movement for posterior chain development',
    variations: ['Romanian Deadlift', 'Sumo Deadlift', 'Trap Bar Deadlift'],
  },
  {
    name: 'Squat',
    type: 'weight-training',
    category: 'Compound',
    muscleGroups: ['Quadriceps', 'Glutes', 'Core'],
    equipment: ['Barbell', 'Dumbbell', 'Bodyweight'],
    difficulty: 'Intermediate',
    description: 'King of leg exercises for overall lower body strength',
    variations: [
      'Front Squat',
      'Back Squat',
      'Goblet Squat',
      'Bodyweight Squat',
    ],
  },
  {
    name: 'Pull-Up',
    type: 'bodyweight',
    category: 'Compound',
    muscleGroups: ['Back', 'Biceps'],
    equipment: ['Bodyweight'],
    difficulty: 'Intermediate',
    description: 'Upper body pulling movement for back strength',
    variations: ['Chin-Up', 'Assisted Pull-Up', 'Wide Grip Pull-Up'],
  },
  {
    name: 'Push-Up',
    type: 'bodyweight',
    category: 'Compound',
    muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
    equipment: ['Bodyweight'],
    difficulty: 'Beginner',
    description: 'Classic bodyweight exercise for upper body strength',
    variations: ['Diamond Push-Up', 'Wide Push-Up', 'Decline Push-Up'],
  },

  // Isolation Exercises
  {
    name: 'Dumbbell Curl',
    type: 'weight-training',
    category: 'Isolation',
    muscleGroups: ['Biceps'],
    equipment: ['Dumbbell'],
    difficulty: 'Beginner',
    description: 'Isolation exercise for bicep development',
    variations: ['Hammer Curl', 'Preacher Curl', 'Concentration Curl'],
  },
  {
    name: 'Tricep Extension',
    type: 'weight-training',
    category: 'Isolation',
    muscleGroups: ['Triceps'],
    equipment: ['Dumbbell', 'Cable Machine'],
    difficulty: 'Beginner',
    description: 'Isolation exercise for tricep development',
    variations: ['Overhead Extension', 'Cable Extension', 'Diamond Push-Up'],
  },
  {
    name: 'Lat Pulldown',
    type: 'weight-training',
    category: 'Isolation',
    muscleGroups: ['Back'],
    equipment: ['Cable Machine'],
    difficulty: 'Beginner',
    description: 'Machine-based back exercise',
    variations: ['Wide Grip', 'Close Grip', 'Reverse Grip'],
  },

  // Core Exercises
  {
    name: 'Plank',
    type: 'bodyweight',
    category: 'Core',
    muscleGroups: ['Core'],
    equipment: ['Bodyweight'],
    difficulty: 'Beginner',
    description: 'Static core exercise for stability',
    variations: ['Side Plank', 'Forearm Plank', 'High Plank'],
  },
  {
    name: 'Sit-Up',
    type: 'bodyweight',
    category: 'Core',
    muscleGroups: ['Core'],
    equipment: ['Bodyweight'],
    difficulty: 'Beginner',
    description: 'Dynamic core exercise',
    variations: ['Crunches', 'Russian Twist', 'Bicycle Crunch'],
  },
  {
    name: 'Russian Twist',
    type: 'bodyweight',
    category: 'Core',
    muscleGroups: ['Core'],
    equipment: ['Bodyweight', 'Medicine Ball'],
    difficulty: 'Intermediate',
    description: 'Rotational core exercise',
    variations: ['Weighted Russian Twist', 'Feet Elevated Russian Twist'],
  },

  // Cardio Exercises
  {
    name: 'Sprint',
    type: 'cardio',
    category: 'Cardiovascular',
    muscleGroups: ['Cardiovascular', 'Full Body'],
    equipment: ['None'],
    difficulty: 'Intermediate',
    description: 'High-intensity running for cardiovascular fitness',
    variations: ['Hill Sprints', 'Interval Sprints', 'Treadmill Sprints'],
  },
  {
    name: 'Jog',
    type: 'cardio',
    category: 'Cardiovascular',
    muscleGroups: ['Cardiovascular', 'Full Body'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Low-intensity running for endurance',
    variations: ['Treadmill Jog', 'Outdoor Jog', 'Trail Running'],
  },
  {
    name: 'Run',
    type: 'cardio',
    category: 'Cardiovascular',
    muscleGroups: ['Cardiovascular', 'Full Body'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Moderate-intensity running',
    variations: ['Long Distance', 'Tempo Run', 'Fartlek Training'],
  },
  {
    name: 'Bike',
    type: 'cardio',
    category: 'Cardiovascular',
    muscleGroups: ['Cardiovascular', 'Quadriceps', 'Calves'],
    equipment: ['Bike'],
    difficulty: 'Beginner',
    description: 'Low-impact cardiovascular exercise',
    variations: ['Stationary Bike', 'Road Cycling', 'Mountain Biking'],
  },
  {
    name: 'Swim',
    type: 'cardio',
    category: 'Cardiovascular',
    muscleGroups: ['Cardiovascular', 'Full Body'],
    equipment: ['None'],
    difficulty: 'Intermediate',
    description: 'Full-body cardiovascular exercise',
    variations: ['Freestyle', 'Breaststroke', 'Butterfly', 'Backstroke'],
  },
  {
    name: 'Row',
    type: 'cardio',
    category: 'Cardiovascular',
    muscleGroups: ['Cardiovascular', 'Back', 'Arms'],
    equipment: ['Rower'],
    difficulty: 'Intermediate',
    description: 'Full-body cardio with emphasis on back',
    variations: ['Indoor Rowing', 'Outdoor Rowing', 'Interval Rowing'],
  },

  // Mobility Exercises
  {
    name: 'Yoga Flow',
    type: 'mobility',
    category: 'Flexibility',
    muscleGroups: ['Full Body'],
    equipment: ['Yoga Mat'],
    difficulty: 'Beginner',
    description: 'Dynamic yoga sequence for flexibility and mindfulness',
    variations: ['Vinyasa Flow', 'Power Yoga', 'Gentle Flow'],
  },
  {
    name: 'Sun Salutation',
    type: 'mobility',
    category: 'Flexibility',
    muscleGroups: ['Full Body'],
    equipment: ['Yoga Mat'],
    difficulty: 'Beginner',
    description: 'Classic yoga warm-up sequence',
    variations: ['Surya Namaskara A', 'Surya Namaskara B'],
  },
  {
    name: 'Downward Dog',
    type: 'mobility',
    category: 'Flexibility',
    muscleGroups: ['Shoulders', 'Core', 'Calves'],
    equipment: ['Yoga Mat'],
    difficulty: 'Beginner',
    description:
      'Foundational yoga pose for shoulder and hamstring flexibility',
    variations: ['Three-Legged Dog', 'Puppy Dog'],
  },

  // Additional Common Exercises
  {
    name: 'Lunge',
    type: 'weight-training',
    category: 'Compound',
    muscleGroups: ['Quadriceps', 'Glutes', 'Core'],
    equipment: ['Bodyweight', 'Dumbbell'],
    difficulty: 'Beginner',
    description: 'Unilateral leg exercise for balance and strength',
    variations: ['Walking Lunge', 'Reverse Lunge', 'Side Lunge'],
  },
  {
    name: 'Hip Thrust',
    type: 'weight-training',
    category: 'Compound',
    muscleGroups: ['Glutes', 'Hamstrings'],
    equipment: ['Barbell', 'Dumbbell', 'Bodyweight'],
    difficulty: 'Intermediate',
    description: 'Glute-focused exercise for posterior chain development',
    variations: [
      'Single Leg Hip Thrust',
      'Glute Bridge',
      'Weighted Hip Thrust',
    ],
  },
  {
    name: 'Calf Raise',
    type: 'weight-training',
    category: 'Isolation',
    muscleGroups: ['Calves'],
    equipment: ['Bodyweight', 'Dumbbell'],
    difficulty: 'Beginner',
    description: 'Isolation exercise for calf development',
    variations: [
      'Standing Calf Raise',
      'Seated Calf Raise',
      'Single Leg Calf Raise',
    ],
  },
];

// Helper functions for LLM to use
export const getExercisesByType = (
  type: ActivityType
): ExerciseDefinition[] => {
  return EXERCISE_DATABASE.filter(exercise => exercise.type === type);
};

export const getExercisesByMuscleGroup = (
  muscleGroup: MuscleGroup
): ExerciseDefinition[] => {
  return EXERCISE_DATABASE.filter(exercise =>
    exercise.muscleGroups.includes(muscleGroup)
  );
};

export const getExercisesByCategory = (
  category: ExerciseCategory
): ExerciseDefinition[] => {
  return EXERCISE_DATABASE.filter(exercise => exercise.category === category);
};

export const getExercisesByDifficulty = (
  difficulty: ExerciseDefinition['difficulty']
): ExerciseDefinition[] => {
  return EXERCISE_DATABASE.filter(
    exercise => exercise.difficulty === difficulty
  );
};

export const findExerciseByName = (
  name: string
): ExerciseDefinition | undefined => {
  return EXERCISE_DATABASE.find(
    exercise => exercise.name.toLowerCase() === name.toLowerCase()
  );
};

export const searchExercises = (query: string): ExerciseDefinition[] => {
  const lowerQuery = query.toLowerCase();
  return EXERCISE_DATABASE.filter(
    exercise =>
      exercise.name.toLowerCase().includes(lowerQuery) ||
      exercise.muscleGroups.some(mg => mg.toLowerCase().includes(lowerQuery)) ||
      exercise.category.toLowerCase().includes(lowerQuery)
  );
};

// Export simple arrays for backward compatibility
export const ACTIVITY_TYPES: ActivityType[] = Array.from(
  new Set(EXERCISE_DATABASE.map(ex => ex.type))
);

export const COMMON_EXERCISES: string[] = EXERCISE_DATABASE.map(ex => ex.name);
