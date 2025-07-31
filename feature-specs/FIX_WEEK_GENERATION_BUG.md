# Fix Week Generation Bug - Dev Mode Button

## 🐛 **Issue**

The "Fill Week with Data" feature has a bug where:

- **Monday** gets activities for the correct week
- **Tuesday-Sunday** get activities for the PREVIOUS week
- **Random activities are not unique** (duplicates possible)

## 🔍 **Root Cause**

The date calculation logic in `generateRandomWeekActivities()` is incorrect. The current logic:

```typescript
// BUGGY CODE:
const startOfWeek = new Date(targetDate);
const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
startOfWeek.setDate(targetDate.getDate() - daysToMonday);

// Then in the loop:
currentDate.setDate(startOfWeek.getDate() + dayOffset);
```

This creates date inconsistencies when crossing month boundaries.

## ✅ **Solution**

### Step 1: Fix Date Calculation Logic

**File: `utils/storage.ts`**

Replace the week calculation logic in `generateRandomWeekActivities()`:

```typescript
// Generate random activities for a specific week (dev mode)
export const generateRandomWeekActivities = (
  weekOffset: number = 0
): Activity[] => {
  const activities: Activity[] = [];

  // Use dayjs for reliable date calculations
  const today = dayjs();
  const targetWeek = today.add(weekOffset, 'week');

  // Get Monday of the target week
  const startOfWeek = targetWeek.startOf('week').add(1, 'day'); // dayjs week starts on Sunday, so add 1 day for Monday

  // Sample exercises by category (same as before)
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

  const weekLabel =
    weekOffset === 0
      ? 'current week'
      : weekOffset === -1
        ? 'last week'
        : weekOffset === 1
          ? 'next week'
          : weekOffset < 0
            ? `${Math.abs(weekOffset)} weeks ago`
            : `${weekOffset} weeks from now`;

  console.log(
    `Generated ${activities.length} random activities for ${weekLabel}`
  );
  console.log(
    `Week range: ${startOfWeek.format('MMM D')} - ${startOfWeek.add(6, 'day').format('MMM D, YYYY')}`
  );
  return activities;
};
```

### Step 2: Add Required Import

**File: `utils/storage.ts`**

Make sure dayjs is imported at the top:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs'; // Add this import
import { ExerciseDefinition } from '../constants/exercises';
import { Activity } from '../types/activity';
```

## 🔧 **Key Fixes**

### 1. **Reliable Date Calculation**

- **Use dayjs** instead of native Date object for reliable week calculations
- **startOfWeek().add(1, 'day')** to get Monday properly
- **currentDate = startOfWeek.add(dayOffset, 'day')** for each day

### 2. **Unique Activities**

- **Track used exercises** with `Set<string>`
- **Attempt up to 20 times** to find unique exercise per category
- **Fallback to duplicates** if no unique exercise found (prevents infinite loops)

### 3. **Better Debugging**

- **Log week range** to verify correct Monday-Sunday span
- **Clear date format** in console logs

## 🧪 **Testing**

After implementing the fix:

1. **Clear all data** using dev button
2. **Generate week data**
3. **Check console logs** for week range verification
4. **Verify in Weekly view** that all activities are in the same week
5. **Check for duplicates** - should be minimal within the same week

## 📅 **Expected Behavior**

- **Monday**: Should be the correct week's Monday
- **Tuesday-Sunday**: Should be consecutive days in the SAME week
- **Activities**: Should be mostly unique within the week
- **Console**: Should log something like "Week range: Dec 23 - Dec 29, 2024"

## ⚠️ **Important Notes**

- This uses dayjs which is already imported in the project
- The uniqueness is per-week, not global (you can have the same exercise in different weeks)
- After 20 attempts to find unique exercise, it allows duplicates to prevent infinite loops
- Week calculation now matches the WeeklyScreen's Monday-Sunday layout
