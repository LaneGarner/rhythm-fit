# Comprehensive Stats Screen Implementation Plan

## Overview

Transform the existing Stats screen into a comprehensive analytics dashboard featuring:

1. **Exercise progression tracking** with charts showing weight/reps/time/distance over time
2. **Body part tracking system** with primary and secondary muscle groups for each exercise
3. **Interactive data visualizations** (line charts, bar charts, pie charts)
4. **Drill-down capability** to view detailed stats for any exercise
5. **AI Coach integration** to provide data-driven insights

---

## Phase 1: Add Body Part Data to Exercise Database

### Step 1.1: Update Exercise Interface

**File:** `/rhythm-backend/lib/exercises.ts`

Add `BodyPart` type and update `Exercise` interface:

```typescript
// Add after ActivityType definition (line ~11)
export type BodyPart =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'core'
  | 'quadriceps'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'hip-flexors'
  | 'full-body'
  | 'cardio' // For cardio exercises
  | 'none'; // For recovery, mobility, etc.

export interface Exercise {
  name: string;
  type: ActivityType;
  primaryMuscle: BodyPart;
  secondaryMuscles?: BodyPart[];
}
```

### Step 1.2: Update EXERCISE_DATABASE with Muscle Data

**File:** `/rhythm-backend/lib/exercises.ts`

Update each exercise entry with muscle group data. Here is the complete updated database:

```typescript
export const EXERCISE_DATABASE: Exercise[] = [
  // Weight Training - Compound Movements
  {
    name: 'Bench Press',
    type: 'weight-training',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
  },
  {
    name: 'Overhead Press',
    type: 'weight-training',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps', 'core'],
  },
  {
    name: 'Deadlift',
    type: 'weight-training',
    primaryMuscle: 'back',
    secondaryMuscles: ['hamstrings', 'glutes', 'core'],
  },
  {
    name: 'Squat',
    type: 'weight-training',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'hamstrings', 'core'],
  },
  {
    name: 'Bent Over Row',
    type: 'weight-training',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'core'],
  },
  {
    name: 'Lunge',
    type: 'weight-training',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'hamstrings'],
  },
  {
    name: 'Hip Thrust',
    type: 'weight-training',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings', 'core'],
  },
  {
    name: 'Incline Bench Press',
    type: 'weight-training',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
  },
  {
    name: 'Decline Bench Press',
    type: 'weight-training',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps'],
  },
  {
    name: 'Smith Machine Squat',
    type: 'weight-training',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes'],
  },
  // Weight Training - Isolation
  { name: 'Dumbbell Curl', type: 'weight-training', primaryMuscle: 'biceps' },
  {
    name: 'Tricep Extension',
    type: 'weight-training',
    primaryMuscle: 'triceps',
  },
  {
    name: 'Lat Pulldown',
    type: 'weight-training',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps'],
  },
  { name: 'Calf Raise', type: 'weight-training', primaryMuscle: 'calves' },
  {
    name: 'Lateral Raise',
    type: 'weight-training',
    primaryMuscle: 'shoulders',
  },
  {
    name: 'Leg Extension',
    type: 'weight-training',
    primaryMuscle: 'quadriceps',
  },
  { name: 'Leg Curl', type: 'weight-training', primaryMuscle: 'hamstrings' },
  { name: 'Cable Fly', type: 'weight-training', primaryMuscle: 'chest' },
  {
    name: 'Hammer Curl',
    type: 'weight-training',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
  },
  {
    name: 'Face Pull',
    type: 'weight-training',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['back'],
  },

  // Calisthenics
  {
    name: 'Pull-Up',
    type: 'calisthenics',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'core'],
  },
  {
    name: 'Push-Up',
    type: 'calisthenics',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders', 'core'],
  },
  {
    name: 'Dip',
    type: 'calisthenics',
    primaryMuscle: 'triceps',
    secondaryMuscles: ['chest', 'shoulders'],
  },
  {
    name: 'Muscle-Up',
    type: 'calisthenics',
    primaryMuscle: 'back',
    secondaryMuscles: ['chest', 'triceps', 'core'],
  },
  {
    name: 'Handstand Push-Up',
    type: 'calisthenics',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps', 'core'],
  },
  {
    name: 'Pistol Squat',
    type: 'calisthenics',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'core'],
  },
  {
    name: 'L-Sit',
    type: 'calisthenics',
    primaryMuscle: 'core',
    secondaryMuscles: ['hip-flexors', 'triceps'],
  },
  { name: 'Plank', type: 'calisthenics', primaryMuscle: 'core' },
  { name: 'Russian Twist', type: 'calisthenics', primaryMuscle: 'core' },
  { name: 'Bicycle Crunches', type: 'calisthenics', primaryMuscle: 'core' },
  {
    name: 'Leg Raises',
    type: 'calisthenics',
    primaryMuscle: 'core',
    secondaryMuscles: ['hip-flexors'],
  },
  { name: 'Side Plank', type: 'calisthenics', primaryMuscle: 'core' },
  {
    name: 'Planche',
    type: 'calisthenics',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['chest', 'core'],
  },
  {
    name: 'Archer Push-Up',
    type: 'calisthenics',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
  },
  {
    name: 'Shrimp Squat',
    type: 'calisthenics',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes'],
  },
  { name: 'Dragon Flag', type: 'calisthenics', primaryMuscle: 'core' },

  // Cardio
  {
    name: 'Running',
    type: 'cardio',
    primaryMuscle: 'cardio',
    secondaryMuscles: ['quadriceps', 'calves'],
  },
  {
    name: 'Cycling',
    type: 'cardio',
    primaryMuscle: 'cardio',
    secondaryMuscles: ['quadriceps', 'glutes'],
  },
  {
    name: 'Swimming',
    type: 'cardio',
    primaryMuscle: 'cardio',
    secondaryMuscles: ['full-body'],
  },
  {
    name: 'Rowing',
    type: 'cardio',
    primaryMuscle: 'cardio',
    secondaryMuscles: ['back', 'biceps', 'core'],
  },
  {
    name: 'Jump Rope',
    type: 'cardio',
    primaryMuscle: 'cardio',
    secondaryMuscles: ['calves', 'shoulders'],
  },
  {
    name: 'Elliptical',
    type: 'cardio',
    primaryMuscle: 'cardio',
    secondaryMuscles: ['quadriceps', 'glutes'],
  },
  {
    name: 'Stair Climber',
    type: 'cardio',
    primaryMuscle: 'cardio',
    secondaryMuscles: ['quadriceps', 'glutes', 'calves'],
  },
  {
    name: 'High-Intensity Interval Training (HIIT)',
    type: 'cardio',
    primaryMuscle: 'cardio',
    secondaryMuscles: ['full-body'],
  },
  {
    name: 'Sprinting',
    type: 'cardio',
    primaryMuscle: 'cardio',
    secondaryMuscles: ['quadriceps', 'hamstrings', 'glutes'],
  },
  {
    name: 'Mountain Climbers',
    type: 'cardio',
    primaryMuscle: 'cardio',
    secondaryMuscles: ['core', 'shoulders'],
  },
  {
    name: 'Battle Ropes',
    type: 'cardio',
    primaryMuscle: 'cardio',
    secondaryMuscles: ['shoulders', 'core'],
  },

  // Mobility
  { name: 'Tree Pose', type: 'mobility', primaryMuscle: 'none' },
  {
    name: 'Warrior I',
    type: 'mobility',
    primaryMuscle: 'none',
    secondaryMuscles: ['hip-flexors', 'quadriceps'],
  },
  { name: 'Triangle Pose', type: 'mobility', primaryMuscle: 'none' },
  {
    name: 'Crow Pose',
    type: 'mobility',
    primaryMuscle: 'core',
    secondaryMuscles: ['shoulders'],
  },
  {
    name: 'Bridge Pose',
    type: 'mobility',
    primaryMuscle: 'none',
    secondaryMuscles: ['glutes', 'hip-flexors'],
  },
  {
    name: 'Seated Forward Fold',
    type: 'mobility',
    primaryMuscle: 'none',
    secondaryMuscles: ['hamstrings'],
  },
  { name: 'Boat Pose', type: 'mobility', primaryMuscle: 'core' },
  {
    name: 'Camel Pose',
    type: 'mobility',
    primaryMuscle: 'none',
    secondaryMuscles: ['hip-flexors'],
  },
  {
    name: 'Happy Baby',
    type: 'mobility',
    primaryMuscle: 'none',
    secondaryMuscles: ['hip-flexors'],
  },
  { name: 'Yoga', type: 'mobility', primaryMuscle: 'none' },
  { name: 'Sun Salutation', type: 'mobility', primaryMuscle: 'full-body' },
  {
    name: 'Downward Dog',
    type: 'mobility',
    primaryMuscle: 'none',
    secondaryMuscles: ['hamstrings', 'calves', 'shoulders'],
  },
  {
    name: 'Pigeon Pose',
    type: 'mobility',
    primaryMuscle: 'none',
    secondaryMuscles: ['hip-flexors', 'glutes'],
  },
  { name: "Child's Pose", type: 'mobility', primaryMuscle: 'none' },
  {
    name: 'Cat-Cow Stretch',
    type: 'mobility',
    primaryMuscle: 'none',
    secondaryMuscles: ['core'],
  },
  {
    name: 'Hip Flexor Stretch',
    type: 'mobility',
    primaryMuscle: 'none',
    secondaryMuscles: ['hip-flexors'],
  },
  {
    name: 'Hamstring Stretch',
    type: 'mobility',
    primaryMuscle: 'none',
    secondaryMuscles: ['hamstrings'],
  },
  {
    name: 'Shoulder Stretch',
    type: 'mobility',
    primaryMuscle: 'none',
    secondaryMuscles: ['shoulders'],
  },
  {
    name: 'Thoracic Extension',
    type: 'mobility',
    primaryMuscle: 'none',
    secondaryMuscles: ['back'],
  },
  { name: 'Neck Stretch', type: 'mobility', primaryMuscle: 'none' },
  {
    name: 'Wrist Mobility',
    type: 'mobility',
    primaryMuscle: 'none',
    secondaryMuscles: ['forearms'],
  },

  // Recovery
  { name: 'Body Scan Meditation', type: 'recovery', primaryMuscle: 'none' },
  { name: 'Breathwork', type: 'recovery', primaryMuscle: 'none' },
  { name: 'Walking Meditation', type: 'recovery', primaryMuscle: 'none' },
  { name: 'Guided Visualization', type: 'recovery', primaryMuscle: 'none' },
  { name: 'Percussion Massage', type: 'recovery', primaryMuscle: 'none' },
  { name: 'Foam Rolling', type: 'recovery', primaryMuscle: 'none' },
  { name: 'Sauna', type: 'recovery', primaryMuscle: 'none' },
  { name: 'Cold Plunge', type: 'recovery', primaryMuscle: 'none' },
  { name: 'Stretching', type: 'recovery', primaryMuscle: 'none' },
  { name: 'Meditation', type: 'recovery', primaryMuscle: 'none' },
  { name: 'Walking', type: 'recovery', primaryMuscle: 'cardio' },

  // Sports
  { name: 'Basketball', type: 'sports', primaryMuscle: 'full-body' },
  {
    name: 'Soccer',
    type: 'sports',
    primaryMuscle: 'full-body',
    secondaryMuscles: ['quadriceps', 'calves'],
  },
  {
    name: 'Tennis',
    type: 'sports',
    primaryMuscle: 'full-body',
    secondaryMuscles: ['shoulders', 'core'],
  },
  {
    name: 'Golf',
    type: 'sports',
    primaryMuscle: 'core',
    secondaryMuscles: ['shoulders', 'back'],
  },
  {
    name: 'Volleyball',
    type: 'sports',
    primaryMuscle: 'full-body',
    secondaryMuscles: ['shoulders', 'quadriceps'],
  },
  {
    name: 'Baseball',
    type: 'sports',
    primaryMuscle: 'full-body',
    secondaryMuscles: ['shoulders', 'core'],
  },
  {
    name: 'Hockey',
    type: 'sports',
    primaryMuscle: 'full-body',
    secondaryMuscles: ['quadriceps', 'glutes', 'core'],
  },
  { name: 'Rugby', type: 'sports', primaryMuscle: 'full-body' },
  {
    name: 'Rock Climbing',
    type: 'sports',
    primaryMuscle: 'back',
    secondaryMuscles: ['forearms', 'biceps', 'core'],
  },
  {
    name: 'Boxing',
    type: 'sports',
    primaryMuscle: 'full-body',
    secondaryMuscles: ['shoulders', 'core'],
  },
  { name: 'Martial Arts', type: 'sports', primaryMuscle: 'full-body' },
  {
    name: 'Swimming (Competitive)',
    type: 'sports',
    primaryMuscle: 'full-body',
    secondaryMuscles: ['back', 'shoulders'],
  },
  { name: 'Track and Field', type: 'sports', primaryMuscle: 'full-body' },
  {
    name: 'Frisbee',
    type: 'sports',
    primaryMuscle: 'full-body',
    secondaryMuscles: ['shoulders'],
  },
  {
    name: 'Table Tennis',
    type: 'sports',
    primaryMuscle: 'core',
    secondaryMuscles: ['shoulders', 'forearms'],
  },
  {
    name: 'Jump Shot Practice',
    type: 'sports',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['shoulders', 'calves'],
  },

  // Other
  { name: 'Dancing', type: 'other', primaryMuscle: 'full-body' },
  {
    name: 'Hiking',
    type: 'other',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'calves'],
  },
  {
    name: 'Kayaking',
    type: 'other',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'core', 'shoulders'],
  },
  {
    name: 'Paddleboarding',
    type: 'other',
    primaryMuscle: 'core',
    secondaryMuscles: ['shoulders', 'back'],
  },
  {
    name: 'Skateboarding',
    type: 'other',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['core', 'calves'],
  },
  {
    name: 'Surfing',
    type: 'other',
    primaryMuscle: 'core',
    secondaryMuscles: ['shoulders', 'back'],
  },
  { name: 'CrossFit', type: 'other', primaryMuscle: 'full-body' },
  { name: 'Pilates', type: 'other', primaryMuscle: 'core' },
  {
    name: 'Barre',
    type: 'other',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['quadriceps', 'core'],
  },
];
```

### Step 1.3: Add Helper Functions for Muscle Groups

**File:** `/rhythm-backend/lib/exercises.ts`

Add these functions after the existing helper functions:

```typescript
/**
 * Get exercises by primary muscle group
 */
export function getExercisesByMuscle(muscle: BodyPart): Exercise[] {
  return EXERCISE_DATABASE.filter(e => e.primaryMuscle === muscle);
}

/**
 * Get all exercises that work a specific muscle (primary or secondary)
 */
export function getExercisesWorkingMuscle(muscle: BodyPart): Exercise[] {
  return EXERCISE_DATABASE.filter(
    e =>
      e.primaryMuscle === muscle ||
      (e.secondaryMuscles && e.secondaryMuscles.includes(muscle))
  );
}

/**
 * Get muscle groups for an exercise by name
 */
export function getMuscleGroupsForExercise(
  name: string
): { primary: BodyPart; secondary: BodyPart[] } | undefined {
  const exercise = findExerciseByName(name);
  if (!exercise) return undefined;
  return {
    primary: exercise.primaryMuscle,
    secondary: exercise.secondaryMuscles || [],
  };
}

/**
 * Body part display names for UI
 */
export const BODY_PART_LABELS: Record<BodyPart, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  core: 'Core',
  quadriceps: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  'hip-flexors': 'Hip Flexors',
  'full-body': 'Full Body',
  cardio: 'Cardio',
  none: 'None',
};
```

---

## Phase 2: Install Chart Library

### Step 2.1: Install react-native-gifted-charts

**Command (run from rhythm/ directory):**

```bash
npm install react-native-gifted-charts react-native-linear-gradient
```

Note: The app already has `react-native-svg` installed, which is required by gifted-charts.

---

## Phase 3: Create Stats Utility Service

### Step 3.1: Create Stats Calculation Service

**File:** `/rhythm/services/statsService.ts` (NEW FILE)

```typescript
import dayjs from 'dayjs';
import { Activity, SetData } from '../types/activity';

// Mirror the BodyPart type from backend
export type BodyPart =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'core'
  | 'quadriceps'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'hip-flexors'
  | 'full-body'
  | 'cardio'
  | 'none';

export const BODY_PART_LABELS: Record<BodyPart, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  core: 'Core',
  quadriceps: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  'hip-flexors': 'Hip Flexors',
  'full-body': 'Full Body',
  cardio: 'Cardio',
  none: 'None',
};

// Colors for each body part (for charts)
export const BODY_PART_COLORS: Record<BodyPart, string> = {
  chest: '#ef4444',
  back: '#3b82f6',
  shoulders: '#f97316',
  biceps: '#eab308',
  triceps: '#a855f7',
  forearms: '#84cc16',
  core: '#14b8a6',
  quadriceps: '#06b6d4',
  hamstrings: '#8b5cf6',
  glutes: '#ec4899',
  calves: '#6366f1',
  'hip-flexors': '#f59e0b',
  'full-body': '#22c55e',
  cardio: '#ef4444',
  none: '#9ca3af',
};

// Exercise to muscle group mapping (subset for common exercises)
// This will be enhanced when backend integration is added
export const EXERCISE_MUSCLE_MAP: Record<
  string,
  { primary: BodyPart; secondary: BodyPart[] }
> = {
  // Weight Training - Compound
  'bench press': { primary: 'chest', secondary: ['triceps', 'shoulders'] },
  'overhead press': { primary: 'shoulders', secondary: ['triceps', 'core'] },
  deadlift: {
    primary: 'back',
    secondary: ['hamstrings', 'glutes', 'core'],
  },
  squat: {
    primary: 'quadriceps',
    secondary: ['glutes', 'hamstrings', 'core'],
  },
  'bent over row': { primary: 'back', secondary: ['biceps', 'core'] },
  lunge: { primary: 'quadriceps', secondary: ['glutes', 'hamstrings'] },
  'hip thrust': { primary: 'glutes', secondary: ['hamstrings', 'core'] },
  'incline bench press': {
    primary: 'chest',
    secondary: ['shoulders', 'triceps'],
  },
  'decline bench press': { primary: 'chest', secondary: ['triceps'] },
  // Weight Training - Isolation
  'dumbbell curl': { primary: 'biceps', secondary: [] },
  'tricep extension': { primary: 'triceps', secondary: [] },
  'lat pulldown': { primary: 'back', secondary: ['biceps'] },
  'calf raise': { primary: 'calves', secondary: [] },
  'lateral raise': { primary: 'shoulders', secondary: [] },
  'leg extension': { primary: 'quadriceps', secondary: [] },
  'leg curl': { primary: 'hamstrings', secondary: [] },
  'cable fly': { primary: 'chest', secondary: [] },
  'hammer curl': { primary: 'biceps', secondary: ['forearms'] },
  'face pull': { primary: 'shoulders', secondary: ['back'] },
  // Calisthenics
  'pull-up': { primary: 'back', secondary: ['biceps', 'core'] },
  'push-up': { primary: 'chest', secondary: ['triceps', 'shoulders', 'core'] },
  dip: { primary: 'triceps', secondary: ['chest', 'shoulders'] },
  plank: { primary: 'core', secondary: [] },
  'russian twist': { primary: 'core', secondary: [] },
  'leg raises': { primary: 'core', secondary: ['hip-flexors'] },
  // Cardio
  running: { primary: 'cardio', secondary: ['quadriceps', 'calves'] },
  cycling: { primary: 'cardio', secondary: ['quadriceps', 'glutes'] },
  swimming: { primary: 'cardio', secondary: ['full-body'] },
  rowing: { primary: 'cardio', secondary: ['back', 'biceps', 'core'] },
};

export interface ExerciseStats {
  exerciseName: string;
  activityType: string;
  totalSets: number;
  totalReps: number;
  totalWeight: number; // Total volume (weight × reps)
  maxWeight: number;
  maxReps: number;
  totalTime: number; // in seconds
  totalDistance: number;
  sessions: number; // Number of workout sessions
  primaryMuscle: BodyPart;
  secondaryMuscles: BodyPart[];
  history: {
    date: string;
    sets: SetData[];
    maxWeight: number;
    maxReps: number;
    totalVolume: number;
    totalTime: number;
    totalDistance: number;
  }[];
}

export interface MuscleGroupStats {
  muscle: BodyPart;
  label: string;
  color: string;
  totalSets: number;
  totalVolume: number;
  exercises: string[];
  sessions: number;
  isPrimary: boolean; // Whether this muscle was primarily targeted
}

export interface OverallStats {
  totalActivities: number;
  completedActivities: number;
  completionRate: number;
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  totalTime: number;
  totalDistance: number;
  averagePerWeek: number;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Get muscle groups for an exercise name
 */
export function getMuscleGroupsForExercise(name: string): {
  primary: BodyPart;
  secondary: BodyPart[];
} {
  const normalized = name.toLowerCase().trim();

  // Check exact match first
  if (EXERCISE_MUSCLE_MAP[normalized]) {
    return EXERCISE_MUSCLE_MAP[normalized];
  }

  // Check partial match
  for (const [key, value] of Object.entries(EXERCISE_MUSCLE_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  // Default based on common keywords
  if (normalized.includes('curl') || normalized.includes('bicep')) {
    return { primary: 'biceps', secondary: [] };
  }
  if (normalized.includes('tricep') || normalized.includes('extension')) {
    return { primary: 'triceps', secondary: [] };
  }
  if (normalized.includes('chest') || normalized.includes('bench')) {
    return { primary: 'chest', secondary: ['triceps'] };
  }
  if (
    normalized.includes('back') ||
    normalized.includes('row') ||
    normalized.includes('pull')
  ) {
    return { primary: 'back', secondary: ['biceps'] };
  }
  if (
    normalized.includes('squat') ||
    normalized.includes('leg') ||
    normalized.includes('quad')
  ) {
    return { primary: 'quadriceps', secondary: ['glutes'] };
  }
  if (normalized.includes('shoulder') || normalized.includes('press')) {
    return { primary: 'shoulders', secondary: ['triceps'] };
  }
  if (
    normalized.includes('core') ||
    normalized.includes('ab') ||
    normalized.includes('plank')
  ) {
    return { primary: 'core', secondary: [] };
  }
  if (
    normalized.includes('run') ||
    normalized.includes('cardio') ||
    normalized.includes('bike') ||
    normalized.includes('swim')
  ) {
    return { primary: 'cardio', secondary: [] };
  }

  return { primary: 'none', secondary: [] };
}

/**
 * Calculate stats for a specific exercise across all activities
 */
export function calculateExerciseStats(
  activities: Activity[],
  exerciseName: string
): ExerciseStats | null {
  // Find activities that match this exercise name
  const matchingActivities = activities.filter(
    a =>
      a.name.toLowerCase().includes(exerciseName.toLowerCase()) ||
      exerciseName.toLowerCase().includes(a.name.toLowerCase())
  );

  if (matchingActivities.length === 0) return null;

  const muscleGroups = getMuscleGroupsForExercise(exerciseName);
  const history: ExerciseStats['history'] = [];

  let totalSets = 0;
  let totalReps = 0;
  let totalWeight = 0;
  let maxWeight = 0;
  let maxReps = 0;
  let totalTime = 0;
  let totalDistance = 0;

  for (const activity of matchingActivities) {
    if (!activity.sets || activity.sets.length === 0) continue;

    let sessionMaxWeight = 0;
    let sessionMaxReps = 0;
    let sessionVolume = 0;
    let sessionTime = 0;
    let sessionDistance = 0;

    for (const set of activity.sets) {
      if (!set.completed) continue;

      totalSets++;

      if (set.reps) {
        totalReps += set.reps;
        if (set.reps > maxReps) maxReps = set.reps;
        if (set.reps > sessionMaxReps) sessionMaxReps = set.reps;
      }

      if (set.weight) {
        const volume = (set.weight || 0) * (set.reps || 1);
        totalWeight += volume;
        sessionVolume += volume;
        if (set.weight > maxWeight) maxWeight = set.weight;
        if (set.weight > sessionMaxWeight) sessionMaxWeight = set.weight;
      }

      if (set.time) {
        totalTime += set.time;
        sessionTime += set.time;
      }

      if (set.distance) {
        totalDistance += set.distance;
        sessionDistance += set.distance;
      }
    }

    history.push({
      date: activity.date,
      sets: activity.sets,
      maxWeight: sessionMaxWeight,
      maxReps: sessionMaxReps,
      totalVolume: sessionVolume,
      totalTime: sessionTime,
      totalDistance: sessionDistance,
    });
  }

  // Sort history by date
  history.sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix());

  return {
    exerciseName,
    activityType: matchingActivities[0].type,
    totalSets,
    totalReps,
    totalWeight,
    maxWeight,
    maxReps,
    totalTime,
    totalDistance,
    sessions: matchingActivities.length,
    primaryMuscle: muscleGroups.primary,
    secondaryMuscles: muscleGroups.secondary,
    history,
  };
}

/**
 * Calculate stats grouped by muscle group
 */
export function calculateMuscleGroupStats(
  activities: Activity[]
): MuscleGroupStats[] {
  const muscleStats: Record<BodyPart, MuscleGroupStats> = {} as Record<
    BodyPart,
    MuscleGroupStats
  >;

  // Initialize all muscle groups
  for (const muscle of Object.keys(BODY_PART_LABELS) as BodyPart[]) {
    muscleStats[muscle] = {
      muscle,
      label: BODY_PART_LABELS[muscle],
      color: BODY_PART_COLORS[muscle],
      totalSets: 0,
      totalVolume: 0,
      exercises: [],
      sessions: 0,
      isPrimary: false,
    };
  }

  const exerciseSessions: Record<string, Set<string>> = {}; // exercise -> set of dates

  for (const activity of activities) {
    if (!activity.completed || !activity.sets) continue;

    const muscleGroups = getMuscleGroupsForExercise(activity.name);

    // Track unique exercises per muscle
    if (!muscleStats[muscleGroups.primary].exercises.includes(activity.name)) {
      muscleStats[muscleGroups.primary].exercises.push(activity.name);
    }

    // Track sessions
    if (!exerciseSessions[activity.name]) {
      exerciseSessions[activity.name] = new Set();
    }
    exerciseSessions[activity.name].add(activity.date);

    for (const set of activity.sets) {
      if (!set.completed) continue;

      // Primary muscle gets full credit
      muscleStats[muscleGroups.primary].totalSets += 1;
      muscleStats[muscleGroups.primary].isPrimary = true;
      if (set.weight && set.reps) {
        muscleStats[muscleGroups.primary].totalVolume += set.weight * set.reps;
      }

      // Secondary muscles get partial credit (0.5x)
      for (const secondary of muscleGroups.secondary) {
        muscleStats[secondary].totalSets += 0.5;
        if (set.weight && set.reps) {
          muscleStats[secondary].totalVolume += set.weight * set.reps * 0.5;
        }
        if (!muscleStats[secondary].exercises.includes(activity.name)) {
          muscleStats[secondary].exercises.push(activity.name);
        }
      }
    }
  }

  // Calculate sessions for each muscle group
  for (const muscle of Object.keys(muscleStats) as BodyPart[]) {
    const dates = new Set<string>();
    for (const exercise of muscleStats[muscle].exercises) {
      if (exerciseSessions[exercise]) {
        exerciseSessions[exercise].forEach(date => dates.add(date));
      }
    }
    muscleStats[muscle].sessions = dates.size;
  }

  // Filter out muscles with no activity and sort by total sets
  return Object.values(muscleStats)
    .filter(s => s.totalSets > 0)
    .sort((a, b) => b.totalSets - a.totalSets);
}

/**
 * Calculate overall stats
 */
export function calculateOverallStats(
  activities: Activity[],
  daysRange: number = 30
): OverallStats {
  const now = dayjs();
  const startDate = now.subtract(daysRange, 'day');

  const recentActivities = activities.filter(a => {
    const date = dayjs(a.date);
    return date.isAfter(startDate) && date.isBefore(now.add(1, 'day'));
  });

  const completedActivities = recentActivities.filter(a => a.completed);

  let totalSets = 0;
  let totalReps = 0;
  let totalVolume = 0;
  let totalTime = 0;
  let totalDistance = 0;

  for (const activity of completedActivities) {
    if (!activity.sets) continue;

    for (const set of activity.sets) {
      if (!set.completed) continue;
      totalSets++;
      if (set.reps) totalReps += set.reps;
      if (set.weight && set.reps) totalVolume += set.weight * set.reps;
      if (set.time) totalTime += set.time;
      if (set.distance) totalDistance += set.distance;
    }
  }

  // Calculate streaks
  const { currentStreak, longestStreak } = calculateStreaks(activities);

  return {
    totalActivities: recentActivities.length,
    completedActivities: completedActivities.length,
    completionRate:
      recentActivities.length > 0
        ? Math.round(
            (completedActivities.length / recentActivities.length) * 100
          )
        : 0,
    totalSets,
    totalReps,
    totalVolume,
    totalTime,
    totalDistance,
    averagePerWeek: Math.round((recentActivities.length / daysRange) * 7),
    currentStreak,
    longestStreak,
  };
}

/**
 * Calculate workout streaks
 */
function calculateStreaks(activities: Activity[]): {
  currentStreak: number;
  longestStreak: number;
} {
  // Get unique dates with completed activities
  const completedDates = new Set<string>();
  for (const activity of activities) {
    if (activity.completed) {
      completedDates.add(activity.date);
    }
  }

  if (completedDates.size === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const sortedDates = Array.from(completedDates).sort();
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  // Calculate longest streak
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = dayjs(sortedDates[i - 1]);
    const curr = dayjs(sortedDates[i]);
    const diff = curr.diff(prev, 'day');

    if (diff === 1) {
      tempStreak++;
    } else {
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
      tempStreak = 1;
    }
  }
  if (tempStreak > longestStreak) {
    longestStreak = tempStreak;
  }

  // Calculate current streak
  const today = dayjs().format('YYYY-MM-DD');
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

  if (completedDates.has(today) || completedDates.has(yesterday)) {
    currentStreak = 1;
    let checkDate = completedDates.has(today)
      ? dayjs()
      : dayjs().subtract(1, 'day');

    while (
      completedDates.has(checkDate.subtract(1, 'day').format('YYYY-MM-DD'))
    ) {
      currentStreak++;
      checkDate = checkDate.subtract(1, 'day');
    }
  }

  return { currentStreak, longestStreak };
}

/**
 * Get all unique exercise names from activities
 */
export function getUniqueExercises(activities: Activity[]): string[] {
  const exercises = new Set<string>();
  for (const activity of activities) {
    if (activity.name) {
      exercises.add(activity.name);
    }
  }
  return Array.from(exercises).sort();
}

/**
 * Get exercise progression data for charts
 */
export function getExerciseProgressionData(
  stats: ExerciseStats,
  metric: 'weight' | 'reps' | 'volume' | 'time' | 'distance'
): { label: string; value: number }[] {
  return stats.history.map(h => {
    let value = 0;
    switch (metric) {
      case 'weight':
        value = h.maxWeight;
        break;
      case 'reps':
        value = h.maxReps;
        break;
      case 'volume':
        value = h.totalVolume;
        break;
      case 'time':
        value = h.totalTime;
        break;
      case 'distance':
        value = h.totalDistance;
        break;
    }
    return {
      label: dayjs(h.date).format('M/D'),
      value,
    };
  });
}

/**
 * Format time in seconds to readable string
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
}

/**
 * Format weight with units
 */
export function formatWeight(weight: number): string {
  return `${weight} lbs`;
}

/**
 * Format distance with units
 */
export function formatDistance(distance: number): string {
  return `${distance.toFixed(2)} mi`;
}
```

---

## Phase 4: Create Chart Components

### Step 4.1: Create ProgressionChart Component

**File:** `/rhythm/components/charts/ProgressionChart.tsx` (NEW FILE)

```typescript
import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTheme } from '../../theme/ThemeContext';

interface DataPoint {
  label: string;
  value: number;
}

interface ProgressionChartProps {
  data: DataPoint[];
  title: string;
  color?: string;
  suffix?: string;
  height?: number;
}

export const ProgressionChart = ({
  data,
  title,
  color,
  suffix = '',
  height = 200,
}: ProgressionChartProps) => {
  const { colors } = useTheme();
  const chartColor = color || colors.primary.main;
  const screenWidth = Dimensions.get('window').width;

  if (data.length === 0) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          padding: 16,
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
          {title}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            marginTop: 16,
            textAlign: 'center',
          }}
        >
          No data available
        </Text>
      </View>
    );
  }

  const chartData = data.map(d => ({
    value: d.value,
    label: d.label,
    dataPointText: `${d.value}${suffix}`,
  }));

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: 16,
          fontWeight: '600',
          marginBottom: 16,
        }}
      >
        {title}
      </Text>

      <LineChart
        data={chartData}
        height={height}
        width={screenWidth - 80}
        spacing={(screenWidth - 100) / Math.max(data.length - 1, 1)}
        color={chartColor}
        thickness={2}
        startFillColor={chartColor}
        endFillColor={colors.background}
        startOpacity={0.3}
        endOpacity={0.05}
        areaChart
        curved
        hideDataPoints={data.length > 10}
        dataPointsColor={chartColor}
        dataPointsRadius={4}
        textColor={colors.textSecondary}
        textFontSize={10}
        xAxisColor={colors.border}
        yAxisColor={colors.border}
        yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
        hideRules={false}
        rulesColor={colors.border}
        rulesType="dashed"
        maxValue={maxValue * 1.1}
        noOfSections={4}
        yAxisLabelSuffix={suffix}
        isAnimated
        animationDuration={500}
        pointerConfig={{
          pointerStripHeight: height,
          pointerStripColor: colors.textSecondary,
          pointerStripWidth: 1,
          pointerColor: chartColor,
          radius: 6,
          pointerLabelWidth: 80,
          pointerLabelHeight: 30,
          pointerLabelComponent: (items: any) => {
            return (
              <View
                style={{
                  backgroundColor: colors.surface,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text, fontSize: 12 }}>
                  {items[0]?.value}
                  {suffix}
                </Text>
              </View>
            );
          },
        }}
      />

      {/* Summary stats */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginTop: 16,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>High</Text>
          <Text style={{ color: colors.success.main, fontWeight: '600' }}>
            {maxValue}
            {suffix}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Low</Text>
          <Text style={{ color: colors.error.main, fontWeight: '600' }}>
            {minValue}
            {suffix}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            Sessions
          </Text>
          <Text style={{ color: colors.text, fontWeight: '600' }}>
            {data.length}
          </Text>
        </View>
      </View>
    </View>
  );
};
```

### Step 4.2: Create MuscleGroupChart Component

**File:** `/rhythm/components/charts/MuscleGroupChart.tsx` (NEW FILE)

```typescript
import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useTheme } from '../../theme/ThemeContext';
import { MuscleGroupStats, BODY_PART_COLORS } from '../../services/statsService';

interface MuscleGroupChartProps {
  data: MuscleGroupStats[];
  title?: string;
}

export const MuscleGroupChart = ({
  data,
  title = 'Muscle Group Distribution',
}: MuscleGroupChartProps) => {
  const { colors } = useTheme();
  const screenWidth = Dimensions.get('window').width;

  if (data.length === 0) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          padding: 16,
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
          {title}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            marginTop: 16,
            textAlign: 'center',
          }}
        >
          No data available
        </Text>
      </View>
    );
  }

  const totalSets = data.reduce((sum, d) => sum + d.totalSets, 0);

  const pieData = data.slice(0, 8).map(d => ({
    value: d.totalSets,
    color: d.color,
    text: `${Math.round((d.totalSets / totalSets) * 100)}%`,
    label: d.label,
  }));

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: 16,
          fontWeight: '600',
          marginBottom: 16,
        }}
      >
        {title}
      </Text>

      <View style={{ alignItems: 'center' }}>
        <PieChart
          data={pieData}
          donut
          radius={100}
          innerRadius={60}
          innerCircleColor={colors.surface}
          centerLabelComponent={() => (
            <View style={{ alignItems: 'center' }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 24,
                  fontWeight: 'bold',
                }}
              >
                {Math.round(totalSets)}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Total Sets
              </Text>
            </View>
          )}
          isAnimated
        />
      </View>

      {/* Legend */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginTop: 16,
          gap: 8,
        }}
      >
        {pieData.map((item, index) => (
          <View
            key={index}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginHorizontal: 4,
              marginVertical: 2,
            }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: item.color,
                marginRight: 4,
              }}
            />
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {item.label} ({item.text})
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};
```

### Step 4.3: Create BarChartComponent

**File:** `/rhythm/components/charts/VolumeBarChart.tsx` (NEW FILE)

```typescript
import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useTheme } from '../../theme/ThemeContext';

interface BarDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface VolumeBarChartProps {
  data: BarDataPoint[];
  title: string;
  suffix?: string;
  height?: number;
}

export const VolumeBarChart = ({
  data,
  title,
  suffix = '',
  height = 200,
}: VolumeBarChartProps) => {
  const { colors } = useTheme();
  const screenWidth = Dimensions.get('window').width;

  if (data.length === 0) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          padding: 16,
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
          {title}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            marginTop: 16,
            textAlign: 'center',
          }}
        >
          No data available
        </Text>
      </View>
    );
  }

  const barData = data.map(d => ({
    value: d.value,
    label: d.label,
    frontColor: d.color || colors.primary.main,
    topLabelComponent: () => (
      <Text style={{ color: colors.textSecondary, fontSize: 10, marginBottom: 4 }}>
        {d.value > 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value}
      </Text>
    ),
  }));

  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = Math.min(32, (screenWidth - 100) / data.length - 8);

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: 16,
          fontWeight: '600',
          marginBottom: 16,
        }}
      >
        {title}
      </Text>

      <BarChart
        data={barData}
        height={height}
        width={screenWidth - 80}
        barWidth={barWidth}
        spacing={8}
        xAxisColor={colors.border}
        yAxisColor={colors.border}
        yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
        hideRules={false}
        rulesColor={colors.border}
        rulesType="dashed"
        maxValue={maxValue * 1.1}
        noOfSections={4}
        yAxisLabelSuffix={suffix}
        isAnimated
        animationDuration={500}
        barBorderRadius={4}
      />
    </View>
  );
};
```

### Step 4.4: Export Chart Components

**File:** `/rhythm/components/charts/index.ts` (NEW FILE)

```typescript
export { ProgressionChart } from './ProgressionChart';
export { MuscleGroupChart } from './MuscleGroupChart';
export { VolumeBarChart } from './VolumeBarChart';
```

---

## Phase 5: Create Exercise Detail Screen

### Step 5.1: Create ExerciseStatsScreen

**File:** `/rhythm/screens/ExerciseStatsScreen.tsx` (NEW FILE)

```typescript
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { ProgressionChart } from '../components/charts/ProgressionChart';
import { RootState } from '../redux/store';
import {
  calculateExerciseStats,
  formatTime,
  formatWeight,
  formatDistance,
  getExerciseProgressionData,
  BODY_PART_LABELS,
  BODY_PART_COLORS,
} from '../services/statsService';
import { useTheme } from '../theme/ThemeContext';

type MetricType = 'weight' | 'reps' | 'volume' | 'time' | 'distance';

export default function ExerciseStatsScreen({ navigation, route }: any) {
  const { exerciseName } = route.params;
  const activities = useSelector((state: RootState) => state.activities.data);
  const { colors, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const [selectedMetric, setSelectedMetric] = useState<MetricType>('weight');

  const stats = useMemo(
    () => calculateExerciseStats(activities, exerciseName),
    [activities, exerciseName]
  );

  const chartData = useMemo(() => {
    if (!stats) return [];
    return getExerciseProgressionData(stats, selectedMetric);
  }, [stats, selectedMetric]);

  const getMetricSuffix = (metric: MetricType): string => {
    switch (metric) {
      case 'weight':
        return ' lbs';
      case 'reps':
        return '';
      case 'volume':
        return ' lbs';
      case 'time':
        return 's';
      case 'distance':
        return ' mi';
      default:
        return '';
    }
  };

  const availableMetrics: MetricType[] = useMemo(() => {
    if (!stats) return [];
    const metrics: MetricType[] = [];
    if (stats.maxWeight > 0) metrics.push('weight');
    if (stats.maxReps > 0) metrics.push('reps');
    if (stats.totalWeight > 0) metrics.push('volume');
    if (stats.totalTime > 0) metrics.push('time');
    if (stats.totalDistance > 0) metrics.push('distance');
    return metrics;
  }, [stats]);

  if (!stats) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingTop: 72,
            paddingBottom: 16,
            paddingHorizontal: 16,
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <TouchableOpacity
            hitSlop={14}
            onPress={() => navigation.goBack()}
            style={{ paddingVertical: 4, paddingHorizontal: 8, marginRight: 8 }}
          >
            <Text style={{ color: colors.primary.main, fontSize: 18, fontWeight: '500' }}>
              Back
            </Text>
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center p-4">
          <Ionicons name="stats-chart-outline" size={48} color={colors.textSecondary} />
          <Text style={{ color: colors.text, fontSize: 18, marginTop: 16 }}>
            No data found for this exercise
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 72,
          paddingBottom: 16,
          paddingHorizontal: 16,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity
          hitSlop={14}
          onPress={() => navigation.goBack()}
          style={{ paddingVertical: 4, paddingHorizontal: 8, marginRight: 8 }}
        >
          <Text style={{ color: colors.primary.main, fontSize: 18, fontWeight: '500' }}>
            Back
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={{ color: colors.text, fontSize: 20, fontWeight: 'bold' }}
            numberOfLines={1}
          >
            {exerciseName}
          </Text>
        </View>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        {/* Muscle Groups */}
        <View
          style={{
            backgroundColor: colors.surface,
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
            Muscles Worked
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <View
              style={{
                backgroundColor: BODY_PART_COLORS[stats.primaryMuscle],
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>
                {BODY_PART_LABELS[stats.primaryMuscle]}
              </Text>
            </View>
            {stats.secondaryMuscles.map(muscle => (
              <View
                key={muscle}
                style={{
                  backgroundColor: colors.backgroundSecondary,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: BODY_PART_COLORS[muscle],
                }}
              >
                <Text style={{ color: BODY_PART_COLORS[muscle] }}>
                  {BODY_PART_LABELS[muscle]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Summary Stats */}
        <View
          style={{
            backgroundColor: colors.surface,
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
            All-Time Stats
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            <View style={{ minWidth: 80 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Sessions</Text>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold' }}>
                {stats.sessions}
              </Text>
            </View>
            <View style={{ minWidth: 80 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Total Sets</Text>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold' }}>
                {stats.totalSets}
              </Text>
            </View>
            {stats.maxWeight > 0 && (
              <View style={{ minWidth: 80 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Max Weight</Text>
                <Text style={{ color: colors.success.main, fontSize: 20, fontWeight: 'bold' }}>
                  {formatWeight(stats.maxWeight)}
                </Text>
              </View>
            )}
            {stats.maxReps > 0 && (
              <View style={{ minWidth: 80 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Max Reps</Text>
                <Text style={{ color: colors.success.main, fontSize: 20, fontWeight: 'bold' }}>
                  {stats.maxReps}
                </Text>
              </View>
            )}
            {stats.totalTime > 0 && (
              <View style={{ minWidth: 80 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Total Time</Text>
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold' }}>
                  {formatTime(stats.totalTime)}
                </Text>
              </View>
            )}
            {stats.totalDistance > 0 && (
              <View style={{ minWidth: 80 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Total Distance</Text>
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold' }}>
                  {formatDistance(stats.totalDistance)}
                </Text>
              </View>
            )}
            {stats.totalWeight > 0 && (
              <View style={{ minWidth: 120 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Total Volume</Text>
                <Text style={{ color: colors.primary.main, fontSize: 20, fontWeight: 'bold' }}>
                  {stats.totalWeight.toLocaleString()} lbs
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Metric Selector */}
        {availableMetrics.length > 1 && (
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 4,
              marginBottom: 16,
            }}
          >
            {availableMetrics.map(metric => (
              <TouchableOpacity
                key={metric}
                onPress={() => setSelectedMetric(metric)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor:
                    selectedMetric === metric ? colors.primary.main : 'transparent',
                }}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    color:
                      selectedMetric === metric ? '#fff' : colors.textSecondary,
                    fontWeight: selectedMetric === metric ? '600' : '400',
                    textTransform: 'capitalize',
                  }}
                >
                  {metric}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Progression Chart */}
        <ProgressionChart
          data={chartData}
          title={`${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Progression`}
          color={colors.primary.main}
          suffix={getMetricSuffix(selectedMetric)}
        />

        {/* Recent History */}
        <View
          style={{
            backgroundColor: colors.surface,
            padding: 16,
            borderRadius: 12,
            marginBottom: 32,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
            Recent Sessions
          </Text>
          {stats.history.slice(-5).reverse().map((session, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12,
                borderBottomWidth: index < 4 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ color: colors.text }}>
                {dayjs(session.date).format('MMM D, YYYY')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                {session.maxWeight > 0 && (
                  <Text style={{ color: colors.textSecondary }}>
                    {session.maxWeight} lbs
                  </Text>
                )}
                {session.maxReps > 0 && (
                  <Text style={{ color: colors.textSecondary }}>
                    {session.maxReps} reps
                  </Text>
                )}
                {session.totalTime > 0 && (
                  <Text style={{ color: colors.textSecondary }}>
                    {formatTime(session.totalTime)}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
```

---

## Phase 6: Update StatsScreen

### Step 6.1: Replace StatsScreen with Comprehensive Version

**File:** `/rhythm/screens/StatsScreen.tsx`

Replace the entire file with:

```typescript
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import AppHeader, { AppHeaderTitle } from '../components/AppHeader';
import { MuscleGroupChart } from '../components/charts/MuscleGroupChart';
import { VolumeBarChart } from '../components/charts/VolumeBarChart';
import { RootState } from '../redux/store';
import {
  calculateMuscleGroupStats,
  calculateOverallStats,
  getUniqueExercises,
  calculateExerciseStats,
  formatTime,
  BODY_PART_COLORS,
} from '../services/statsService';
import { useTheme } from '../theme/ThemeContext';

type TimeRange = 7 | 30 | 90 | 365;

export default function StatsScreen({ navigation }: any) {
  const activities = useSelector((state: RootState) => state.activities.data);
  const { colorScheme, colors } = useTheme();
  const isDark = colorScheme === 'dark';

  const [timeRange, setTimeRange] = useState<TimeRange>(30);

  // Filter activities by time range
  const filteredActivities = useMemo(() => {
    const startDate = dayjs().subtract(timeRange, 'day');
    const today = dayjs().endOf('day');
    return activities.filter(activity => {
      const activityDate = dayjs(activity.date);
      return (
        activityDate.isAfter(startDate) &&
        (activityDate.isBefore(today) || activityDate.isSame(today, 'day'))
      );
    });
  }, [activities, timeRange]);

  // Calculate stats
  const overallStats = useMemo(
    () => calculateOverallStats(activities, timeRange),
    [activities, timeRange]
  );

  const muscleStats = useMemo(
    () => calculateMuscleGroupStats(filteredActivities),
    [filteredActivities]
  );

  const uniqueExercises = useMemo(
    () => getUniqueExercises(filteredActivities),
    [filteredActivities]
  );

  // Get top exercises by sessions
  const topExercises = useMemo(() => {
    return uniqueExercises
      .map(name => {
        const stats = calculateExerciseStats(filteredActivities, name);
        return { name, sessions: stats?.sessions || 0, stats };
      })
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5);
  }, [uniqueExercises, filteredActivities]);

  // Weekly volume data
  const weeklyVolumeData = useMemo(() => {
    const weeks: { label: string; value: number }[] = [];
    const weeksToShow = Math.min(Math.floor(timeRange / 7), 12);

    for (let i = weeksToShow - 1; i >= 0; i--) {
      const weekStart = dayjs().subtract(i * 7 + 6, 'day');
      const weekEnd = dayjs().subtract(i * 7, 'day');
      const label = weekStart.format('M/D');

      let volume = 0;
      for (const activity of activities) {
        const activityDate = dayjs(activity.date);
        if (
          activityDate.isAfter(weekStart.subtract(1, 'day')) &&
          activityDate.isBefore(weekEnd.add(1, 'day')) &&
          activity.completed &&
          activity.sets
        ) {
          for (const set of activity.sets) {
            if (set.completed && set.weight && set.reps) {
              volume += set.weight * set.reps;
            }
          }
        }
      }
      weeks.push({ label, value: volume });
    }
    return weeks;
  }, [activities, timeRange]);

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: 7, label: '7D' },
    { value: 30, label: '30D' },
    { value: 90, label: '90D' },
    { value: 365, label: '1Y' },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <AppHeader>
        <AppHeaderTitle
          title="Your Stats"
          subtitle={`Last ${timeRange} Days`}
        />
      </AppHeader>

      {/* Time Range Selector */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.surface,
          marginHorizontal: 16,
          marginTop: 16,
          borderRadius: 12,
          padding: 4,
        }}
      >
        {timeRangeOptions.map(option => (
          <TouchableOpacity
            key={option.value}
            onPress={() => setTimeRange(option.value)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor:
                timeRange === option.value ? colors.primary.main : 'transparent',
            }}
          >
            <Text
              style={{
                textAlign: 'center',
                color:
                  timeRange === option.value ? '#fff' : colors.textSecondary,
                fontWeight: timeRange === option.value ? '600' : '400',
              }}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        {/* Summary Cards */}
        <View className="flex-row justify-between mb-4">
          <View
            style={{ backgroundColor: colors.surface }}
            className="flex-1 p-4 rounded-xl mr-2 shadow-sm"
          >
            <Text
              className="text-2xl font-bold"
              style={{ color: colors.primary.main }}
            >
              {overallStats.totalActivities}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm">
              Activities
            </Text>
          </View>
          <View
            style={{ backgroundColor: colors.surface }}
            className="flex-1 p-4 rounded-xl ml-2 shadow-sm"
          >
            <Text
              className="text-2xl font-bold"
              style={{ color: colors.success.main }}
            >
              {overallStats.completionRate}%
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm">
              Completion
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between mb-4">
          <View
            style={{ backgroundColor: colors.surface }}
            className="flex-1 p-4 rounded-xl mr-2 shadow-sm"
          >
            <Text
              className="text-2xl font-bold"
              style={{ color: colors.warning.main }}
            >
              {overallStats.currentStreak}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm">
              Current Streak
            </Text>
          </View>
          <View
            style={{ backgroundColor: colors.surface }}
            className="flex-1 p-4 rounded-xl ml-2 shadow-sm"
          >
            <Text
              className="text-2xl font-bold"
              style={{ color: colors.secondary.main }}
            >
              {overallStats.averagePerWeek}/wk
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm">
              Avg Activities
            </Text>
          </View>
        </View>

        {/* Volume & Reps Stats */}
        <View
          style={{ backgroundColor: colors.surface }}
          className="p-4 rounded-xl mb-4 shadow-sm"
        >
          <Text
            className="text-lg font-semibold mb-3"
            style={{ color: colors.text }}
          >
            Training Summary
          </Text>
          <View className="flex-row flex-wrap">
            <View style={{ width: '50%', marginBottom: 12 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Total Sets
              </Text>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>
                {overallStats.totalSets}
              </Text>
            </View>
            <View style={{ width: '50%', marginBottom: 12 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Total Reps
              </Text>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>
                {overallStats.totalReps.toLocaleString()}
              </Text>
            </View>
            <View style={{ width: '50%' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Total Volume
              </Text>
              <Text style={{ color: colors.primary.main, fontSize: 18, fontWeight: '600' }}>
                {overallStats.totalVolume.toLocaleString()} lbs
              </Text>
            </View>
            {overallStats.totalTime > 0 && (
              <View style={{ width: '50%' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Total Time
                </Text>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>
                  {formatTime(overallStats.totalTime)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Weekly Volume Chart */}
        {weeklyVolumeData.some(w => w.value > 0) && (
          <VolumeBarChart
            data={weeklyVolumeData}
            title="Weekly Volume"
            suffix=" lbs"
          />
        )}

        {/* Muscle Group Distribution */}
        {muscleStats.length > 0 && (
          <MuscleGroupChart
            data={muscleStats}
            title="Muscle Group Distribution"
          />
        )}

        {/* Top Exercises */}
        <View
          style={{ backgroundColor: colors.surface }}
          className="p-4 rounded-xl mb-4 shadow-sm"
        >
          <Text
            className="text-lg font-semibold mb-3"
            style={{ color: colors.text }}
          >
            Top Exercises
          </Text>
          {topExercises.length > 0 ? (
            topExercises.map((exercise, index) => (
              <TouchableOpacity
                key={exercise.name}
                onPress={() =>
                  navigation.navigate('ExerciseStats', {
                    exerciseName: exercise.name,
                  })
                }
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: index < topExercises.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Text
                    style={{
                      color: colors.primary.main,
                      fontSize: 16,
                      fontWeight: '600',
                      marginRight: 12,
                      width: 24,
                    }}
                  >
                    #{index + 1}
                  </Text>
                  <Text
                    style={{ color: colors.text, flex: 1 }}
                    numberOfLines={1}
                  >
                    {exercise.name}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: colors.textSecondary, marginRight: 8 }}>
                    {exercise.sessions} sessions
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text
              style={{ color: colors.textSecondary }}
              className="text-center py-4"
            >
              No exercises recorded yet
            </Text>
          )}
        </View>

        {/* All Exercises List */}
        {uniqueExercises.length > 5 && (
          <View
            style={{ backgroundColor: colors.surface }}
            className="p-4 rounded-xl mb-6 shadow-sm"
          >
            <Text
              className="text-lg font-semibold mb-3"
              style={{ color: colors.text }}
            >
              All Exercises ({uniqueExercises.length})
            </Text>
            {uniqueExercises.map((exercise, index) => (
              <TouchableOpacity
                key={exercise}
                onPress={() =>
                  navigation.navigate('ExerciseStats', {
                    exerciseName: exercise,
                  })
                }
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderBottomWidth: index < uniqueExercises.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text }} numberOfLines={1}>
                  {exercise}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Spacer for bottom nav */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}
```

---

## Phase 7: Add Navigation Route

### Step 7.1: Add ExerciseStats to Navigation

**File:** `/rhythm/App.tsx`

Add the import at the top with other screen imports:

```typescript
import ExerciseStatsScreen from './screens/ExerciseStatsScreen';
```

Add the screen to the Stack.Navigator (inside the `<Stack.Navigator>` after other Stack.Screen components):

```typescript
<Stack.Screen
  name="ExerciseStats"
  component={ExerciseStatsScreen}
  options={{ headerShown: false }}
/>
```

Also add to the `RootStackParamList` type:

```typescript
ExerciseStats: {
  exerciseName: string;
}
```

---

## Phase 8: Enhance AI Coach with Stats Context

### Step 8.1: Update Activity Context in CoachScreen

**File:** `/rhythm/screens/CoachScreen.tsx`

Update the `activityContext` useMemo to include stats data. Find the existing `activityContext` useMemo and replace with:

```typescript
const activityContext = useMemo(() => {
  const recentActivities = activities.filter(a =>
    dayjs(a.date).isAfter(dayjs().subtract(30, 'day'))
  );
  const upcomingActivities = activities
    .filter(a => dayjs(a.date).isSameOrAfter(dayjs(), 'day'))
    .slice(0, 5);

  // Get this week's activities (based on user's first day preference)
  const startOfWeek = getWeekStart();
  const endOfWeek = getWeekEnd();
  const thisWeekActivities = activities.filter(a => {
    const activityDate = dayjs(a.date);
    return (
      activityDate.isSameOrAfter(startOfWeek, 'day') &&
      activityDate.isSameOrBefore(endOfWeek, 'day')
    );
  });

  // Calculate muscle group focus
  const muscleGroupCount: Record<string, number> = {};
  for (const activity of recentActivities) {
    if (!activity.completed) continue;
    const name = activity.name.toLowerCase();

    // Simple muscle group detection
    if (
      name.includes('bench') ||
      name.includes('chest') ||
      name.includes('push-up')
    ) {
      muscleGroupCount['chest'] = (muscleGroupCount['chest'] || 0) + 1;
    }
    if (
      name.includes('row') ||
      name.includes('pull') ||
      name.includes('back') ||
      name.includes('lat')
    ) {
      muscleGroupCount['back'] = (muscleGroupCount['back'] || 0) + 1;
    }
    if (
      name.includes('squat') ||
      name.includes('leg') ||
      name.includes('lunge')
    ) {
      muscleGroupCount['legs'] = (muscleGroupCount['legs'] || 0) + 1;
    }
    if (name.includes('shoulder') || name.includes('press')) {
      muscleGroupCount['shoulders'] = (muscleGroupCount['shoulders'] || 0) + 1;
    }
    if (name.includes('curl') || name.includes('bicep')) {
      muscleGroupCount['biceps'] = (muscleGroupCount['biceps'] || 0) + 1;
    }
    if (name.includes('tricep') || name.includes('extension')) {
      muscleGroupCount['triceps'] = (muscleGroupCount['triceps'] || 0) + 1;
    }
    if (
      name.includes('core') ||
      name.includes('ab') ||
      name.includes('plank')
    ) {
      muscleGroupCount['core'] = (muscleGroupCount['core'] || 0) + 1;
    }
    if (
      name.includes('run') ||
      name.includes('cardio') ||
      name.includes('bike') ||
      name.includes('swim')
    ) {
      muscleGroupCount['cardio'] = (muscleGroupCount['cardio'] || 0) + 1;
    }
  }

  // Calculate volume trends
  let totalVolume = 0;
  let totalSets = 0;
  for (const activity of recentActivities) {
    if (!activity.completed || !activity.sets) continue;
    for (const set of activity.sets) {
      if (set.completed) {
        totalSets++;
        if (set.weight && set.reps) {
          totalVolume += set.weight * set.reps;
        }
      }
    }
  }

  let context = `Current activity context:\n`;
  context += `- Recent activities (last 30 days): ${recentActivities.length}\n`;
  context += `- Completed: ${recentActivities.filter(a => a.completed).length}\n`;
  context += `- This week's activities: ${thisWeekActivities.length}\n`;
  context += `- Upcoming activities: ${upcomingActivities.length}\n`;
  context += `- Total volume (last 30 days): ${totalVolume.toLocaleString()} lbs\n`;
  context += `- Total sets completed: ${totalSets}\n`;

  // Add muscle group focus analysis
  if (Object.keys(muscleGroupCount).length > 0) {
    context += `\nMuscle group focus (last 30 days):\n`;
    const sortedMuscles = Object.entries(muscleGroupCount).sort(
      ([, a], [, b]) => b - a
    );
    for (const [muscle, count] of sortedMuscles) {
      context += `- ${muscle}: ${count} sessions\n`;
    }

    // Identify potential imbalances
    const topMuscle = sortedMuscles[0];
    const bottomMuscles = sortedMuscles.filter(
      ([, count]) => count < topMuscle[1] * 0.3
    );
    if (bottomMuscles.length > 0) {
      context += `\nPotential areas needing more focus: ${bottomMuscles.map(([m]) => m).join(', ')}\n`;
    }
  }

  if (thisWeekActivities.length > 0) {
    context += `\nThis week's activities:\n`;
    const groupedByDay = thisWeekActivities.reduce(
      (acc, activity) => {
        const day = dayjs(activity.date).format('dddd');
        if (!acc[day]) acc[day] = [];
        acc[day].push(activity);
        return acc;
      },
      {} as { [key: string]: Activity[] }
    );

    Object.entries(groupedByDay).forEach(([day, dayActivities]) => {
      context += `- ${day}: ${dayActivities
        .map(a => `${a.emoji} ${a.name}`)
        .join(', ')}\n`;
    });
  }

  if (upcomingActivities.length > 0) {
    context += `\nUpcoming activities:\n`;
    upcomingActivities.forEach(activity => {
      const date = dayjs(activity.date).format('MMM D');
      context += `- ${date}: ${activity.emoji} ${activity.name}\n`;
    });
  }

  return context;
}, [activities, getWeekStart, getWeekEnd]);
```

---

## Files Summary

### New Files to Create:

1. `/rhythm/services/statsService.ts` - Stats calculation service
2. `/rhythm/components/charts/ProgressionChart.tsx` - Line chart for progression
3. `/rhythm/components/charts/MuscleGroupChart.tsx` - Pie chart for muscle distribution
4. `/rhythm/components/charts/VolumeBarChart.tsx` - Bar chart for weekly volume
5. `/rhythm/components/charts/index.ts` - Chart exports
6. `/rhythm/screens/ExerciseStatsScreen.tsx` - Exercise detail screen

### Files to Modify:

1. `/rhythm-backend/lib/exercises.ts` - Add muscle group data to exercises
2. `/rhythm/screens/StatsScreen.tsx` - Complete replacement with new stats UI
3. `/rhythm/screens/CoachScreen.tsx` - Add stats context to AI
4. `/rhythm/App.tsx` - Add ExerciseStats navigation route

### Package to Install:

```bash
npm install react-native-gifted-charts react-native-linear-gradient
```

---

## Testing Checklist

- [ ] Install new packages and verify build succeeds
- [ ] Verify StatsScreen loads with time range selector
- [ ] Test time range changes (7D, 30D, 90D, 1Y)
- [ ] Verify summary cards show correct data
- [ ] Check muscle group pie chart renders
- [ ] Verify weekly volume bar chart displays
- [ ] Test tapping on exercises navigates to detail screen
- [ ] Verify ExerciseStatsScreen shows progression charts
- [ ] Test metric selector (weight/reps/volume/time/distance)
- [ ] Verify muscle group badges display correctly
- [ ] Check AI coach receives enhanced activity context
- [ ] Test dark mode styling on all new components
- [ ] Verify charts animate smoothly
- [ ] Test with empty data (no activities)
- [ ] Verify personal records highlight correctly
