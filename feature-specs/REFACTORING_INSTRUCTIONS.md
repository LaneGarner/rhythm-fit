# Rhythm App Refactoring Instructions

## Overview

This document contains detailed instructions for refactoring the Rhythm app from "workout" terminology to "activity" terminology, and implementing new features for set management and improved activity name input.

## Part 1: Terminology Refactoring (Workout → Activity)

### 1.1 Type Definitions (`types/workout.ts`)

**Rename file to:** `types/activity.ts`

**Changes:**

- Rename `WorkoutType` to `ActivityType`
- Rename `Workout` interface to `Activity`
- Update all type references
- Keep `SetData` interface as-is (already updated with optional notes)

```typescript
// Before
export type WorkoutType = 'weight-training' | 'bodyweight' | 'cardio' | 'mobility' | 'recovery' | 'sports' | 'other';
export interface Workout { ... }

// After
export type ActivityType = 'weight-training' | 'bodyweight' | 'cardio' | 'mobility' | 'recovery' | 'sports' | 'other';
export interface Activity { ... }
```

### 1.2 Redux Store (`redux/workoutSlice.ts`)

**Rename file to:** `redux/activitySlice.ts`

**Changes:**

- Rename slice from `workoutSlice` to `activitySlice`
- Rename state interface from `WorkoutState` to `ActivityState`
- Rename all action creators
- Update all function names
- Update all variable names

```typescript
// Before
interface WorkoutState {
  data: Workout[];
}
const workoutSlice = createSlice({
  name: 'workouts',
  // ...
  addWorkout(state, action: PayloadAction<Workout>) { ... }
});

// After
interface ActivityState {
  data: Activity[];
}
const activitySlice = createSlice({
  name: 'activities',
  // ...
  addActivity(state, action: PayloadAction<Activity>) { ... }
});
```

**Action creators to rename:**

- `addWorkout` → `addActivity`
- `updateWorkout` → `updateActivity`
- `deleteWorkout` → `deleteActivity`
- `deleteWorkoutsForDate` → `deleteActivitiesForDate`
- `setWorkouts` → `setActivities`
- `markAllWorkoutsCompleteForWeek` → `markAllActivitiesCompleteForWeek`
- `markAllWorkoutsIncompleteForWeek` → `markAllActivitiesIncompleteForWeek`

### 1.3 Store Configuration (`redux/store.ts`)

**Changes:**

- Update import path for renamed slice
- Update slice name in store configuration

```typescript
// Before
import workoutReducer from './workoutSlice';
// ...
workouts: workoutReducer,

// After
import activityReducer from './activitySlice';
// ...
activities: activityReducer,
```

### 1.4 Storage Utilities (`utils/storage.ts`)

**Changes:**

- Rename functions to use "activity" terminology
- Update all type references

```typescript
// Before
export const saveWorkouts = async (workouts: Workout[]) => { ... }
export const loadWorkouts = async (): Promise<Workout[]> => { ... }

// After
export const saveActivities = async (activities: Activity[]) => { ... }
export const loadActivities = async (): Promise<Activity[]> => { ... }
```

### 1.5 Screen Files

#### 1.5.1 `screens/WorkoutScreen.tsx`

**Rename to:** `screens/ActivityScreen.tsx`

**Changes:**

- Update all imports to use new type names
- Rename component from `WorkoutScreen` to `ActivityScreen`
- Update all variable names (`workout` → `activity`)
- Update all function names
- Update all UI text
- Update navigation references

**Key changes:**

```typescript
// Before
import { Workout, WorkoutType } from '../types/workout';
import { addWorkout } from '../redux/workoutSlice';
export default function WorkoutScreen({ navigation, route }: any) {
  const [selectedType, setSelectedType] = useState<WorkoutType>('weight-training');
  const workout: Workout = { ... };
  dispatch(addWorkout(workout));

// After
import { Activity, ActivityType } from '../types/activity';
import { addActivity } from '../redux/activitySlice';
export default function ActivityScreen({ navigation, route }: any) {
  const [selectedType, setSelectedType] = useState<ActivityType>('weight-training');
  const activity: Activity = { ... };
  dispatch(addActivity(activity));
```

**UI text changes:**

- "Add Workout" → "Add Activity"
- "Workout Name" → "Activity Name"
- "Workout Type" → "Activity Type"
- "Save Workout" → "Save Activity"
- "Exercises" → "Sets" (since we're adding set management)

#### 1.5.2 `screens/EditWorkoutScreen.tsx`

**Rename to:** `screens/EditActivityScreen.tsx`

**Changes:**

- Same changes as ActivityScreen but for editing
- Update route parameter from `workoutId` to `activityId`
- Update all references

#### 1.5.3 `screens/DayScreen.tsx`

**Changes:**

- Update all imports
- Rename all variables (`workouts` → `activities`, `dayWorkouts` → `dayActivities`)
- Update all function calls
- Update all UI text
- Update navigation references

**Key changes:**

```typescript
// Before
const workouts = useSelector((state: RootState) => state.workouts.data);
const dayWorkouts = workouts.filter(workout => workout.date === date);

// After
const activities = useSelector((state: RootState) => state.activities.data);
const dayActivities = activities.filter(activity => activity.date === date);
```

**UI text changes:**

- "Add Workout" → "Add Activity"
- "Delete Workout" → "Delete Activity"
- "Edit Workout" → "Edit Activity"
- "Mark Complete" → "Mark Complete"
- "No workouts yet" → "No activities yet"

#### 1.5.4 `screens/WeeklyScreen.tsx`

**Changes:**

- Update all imports and variable names
- Update all function calls
- Update all UI text

#### 1.5.5 `screens/StatsScreen.tsx`

**Changes:**

- Update all imports and variable names
- Fix the stats calculation to count `activity.name` instead of `set.notes`
- Update all UI text

**Key fix for stats:**

```typescript
// Before (incorrect)
recentWorkouts.forEach(workout => {
  if (workout.sets) {
    workout.sets.forEach(set => {
      if (set.notes && set.notes.trim()) {
        const exerciseName = set.notes.trim();
        exerciseCounts[exerciseName] = (exerciseCounts[exerciseName] || 0) + 1;
      }
    });
  }
});

// After (correct)
recentActivities.forEach(activity => {
  if (activity.name) {
    activityCounts[activity.name] = (activityCounts[activity.name] || 0) + 1;
  }
});
```

**UI text changes:**

- "Total Workouts" → "Total Activities"
- "Workout Types" → "Activity Types"
- "Most Common Workout Type" → "Most Common Activity Type"
- "Recent Activity" → "Recent Activities"
- "No recent workouts" → "No recent activities"

#### 1.5.6 `screens/WorkoutExecutionScreen.tsx`

**Rename to:** `screens/ActivityExecutionScreen.tsx`

**Changes:**

- Update all imports and variable names
- Update all function calls
- Update all UI text

#### 1.5.7 `screens/CoachScreen.tsx`

**Changes:**

- Update all imports and variable names
- Update all function calls
- Update OpenAI prompt context to use "activity" terminology
- Update all references in the AI instructions

### 1.6 Navigation Files

**Update all navigation references:**

- `Workout` → `Activity`
- `EditWorkout` → `EditActivity`
- `WorkoutExecution` → `ActivityExecution`

### 1.7 Component Files

#### 1.7.1 `components/ExerciseComboBox.tsx`

**Changes:**

- Update import for renamed type
- Update prop type reference

```typescript
// Before
import { WorkoutType } from '../types/workout';
interface ExerciseComboBoxProps {
  workoutType?: WorkoutType;
}

// After
import { ActivityType } from '../types/activity';
interface ExerciseComboBoxProps {
  activityType?: ActivityType;
}
```

### 1.8 Constants Files

**Update all references to use new terminology:**

- `WORKOUT_TYPES` → `ACTIVITY_TYPES`
- `WORKOUT_EMOJIS` → `ACTIVITY_EMOJIS`

### 1.9 Documentation Files

**Update all documentation:**

- `README.md`
- `instructions.md`
- Any other documentation files

## Part 2: New Features Implementation

### 2.1 Set Management in Activity Creation/Editing

#### 2.1.1 Add Set Management to ActivityScreen

**Location:** `screens/ActivityScreen.tsx`

**New state variables:**

```typescript
const [sets, setSets] = useState<SetData[]>([]);
const [currentSet, setCurrentSet] = useState<Partial<SetData>>({
  reps: undefined,
  weight: undefined,
  time: undefined,
  distance: undefined,
  notes: '',
  completed: false,
});
```

**New functions to add:**

```typescript
const handleAddSet = () => {
  if (
    currentSet.reps ||
    currentSet.weight ||
    currentSet.time ||
    currentSet.distance
  ) {
    const newSet: SetData = {
      id: Date.now().toString(),
      ...currentSet,
      completed: false,
    };
    setSets([...sets, newSet]);
    setCurrentSet({
      reps: undefined,
      weight: undefined,
      time: undefined,
      distance: undefined,
      notes: '',
      completed: false,
    });
  }
};

const handleRemoveSet = (index: number) => {
  setSets(sets.filter((_, i) => i !== index));
};

const handleUpdateSet = (index: number, updatedSet: SetData) => {
  setSets(sets.map((set, i) => (i === index ? updatedSet : set)));
};
```

**UI to add after the Activity Name section:**

```tsx
{
  /* Sets Management */
}
<View className="mb-6">
  <Text
    className="text-lg font-semibold mb-3"
    style={{ color: isDark ? '#fff' : '#111' }}
  >
    Sets
  </Text>

  {/* Current Set Input */}
  <View
    className="mb-4 p-4 rounded-lg border border-gray-300"
    style={{ backgroundColor: isDark ? '#18181b' : '#f9fafb' }}
  >
    <Text
      className="text-sm font-medium mb-2"
      style={{ color: isDark ? '#e5e5e5' : '#374151' }}
    >
      Add New Set
    </Text>

    {/* Weight and Reps Row */}
    <View className="flex-row mb-3">
      <View className="flex-1 mr-2">
        <Text
          className="text-sm mb-1"
          style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
        >
          Weight (lbs)
        </Text>
        <TextInput
          className="bg-white p-2 rounded border border-gray-300"
          placeholder="0"
          keyboardType="numeric"
          value={currentSet.weight?.toString() || ''}
          onChangeText={text =>
            setCurrentSet({
              ...currentSet,
              weight: text ? parseFloat(text) : undefined,
            })
          }
          style={{
            color: isDark ? '#fff' : '#111',
            backgroundColor: isDark ? '#18181b' : '#fff',
            borderColor: isDark ? '#222' : '#d1d5db',
          }}
        />
      </View>
      <View className="flex-1 ml-2">
        <Text
          className="text-sm mb-1"
          style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
        >
          Reps
        </Text>
        <TextInput
          className="bg-white p-2 rounded border border-gray-300"
          placeholder="0"
          keyboardType="numeric"
          value={currentSet.reps?.toString() || ''}
          onChangeText={text =>
            setCurrentSet({
              ...currentSet,
              reps: text ? parseInt(text) : undefined,
            })
          }
          style={{
            color: isDark ? '#fff' : '#111',
            backgroundColor: isDark ? '#18181b' : '#fff',
            borderColor: isDark ? '#222' : '#d1d5db',
          }}
        />
      </View>
    </View>

    {/* Time and Distance Row (for cardio) */}
    <View className="flex-row mb-3">
      <View className="flex-1 mr-2">
        <Text
          className="text-sm mb-1"
          style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
        >
          Time (min)
        </Text>
        <TextInput
          className="bg-white p-2 rounded border border-gray-300"
          placeholder="0"
          keyboardType="numeric"
          value={currentSet.time ? (currentSet.time / 60).toString() : ''}
          onChangeText={text =>
            setCurrentSet({
              ...currentSet,
              time: text ? parseFloat(text) * 60 : undefined,
            })
          }
          style={{
            color: isDark ? '#fff' : '#111',
            backgroundColor: isDark ? '#18181b' : '#fff',
            borderColor: isDark ? '#222' : '#d1d5db',
          }}
        />
      </View>
      <View className="flex-1 ml-2">
        <Text
          className="text-sm mb-1"
          style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
        >
          Distance (mi)
        </Text>
        <TextInput
          className="bg-white p-2 rounded border border-gray-300"
          placeholder="0"
          keyboardType="numeric"
          value={currentSet.distance?.toString() || ''}
          onChangeText={text =>
            setCurrentSet({
              ...currentSet,
              distance: text ? parseFloat(text) : undefined,
            })
          }
          style={{
            color: isDark ? '#fff' : '#111',
            backgroundColor: isDark ? '#18181b' : '#fff',
            borderColor: isDark ? '#222' : '#d1d5db',
          }}
        />
      </View>
    </View>

    {/* Set Notes */}
    <View className="mb-3">
      <Text
        className="text-sm mb-1"
        style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
      >
        Notes (Optional)
      </Text>
      <TextInput
        className="bg-white p-2 rounded border border-gray-300"
        placeholder="e.g., Felt heavy, Good form..."
        value={currentSet.notes || ''}
        onChangeText={text =>
          setCurrentSet({
            ...currentSet,
            notes: text,
          })
        }
        style={{
          color: isDark ? '#fff' : '#111',
          backgroundColor: isDark ? '#18181b' : '#fff',
          borderColor: isDark ? '#222' : '#d1d5db',
        }}
      />
    </View>

    {/* Add Set Button */}
    <TouchableOpacity
      style={{ backgroundColor: isDark ? '#2563eb' : '#3b82f6' }}
      className="py-2 px-4 rounded-lg items-center"
      onPress={handleAddSet}
      disabled={
        !currentSet.reps &&
        !currentSet.weight &&
        !currentSet.time &&
        !currentSet.distance
      }
    >
      <Text className="text-white font-medium">Add Set</Text>
    </TouchableOpacity>
  </View>

  {/* Existing Sets List */}
  {sets.length > 0 && (
    <View>
      <Text
        className="text-sm font-medium mb-2"
        style={{ color: isDark ? '#e5e5e5' : '#374151' }}
      >
        Sets ({sets.length}):
      </Text>
      {sets.map((set, index) => (
        <View
          key={set.id}
          className="flex-row items-center justify-between p-3 rounded-lg mb-2"
          style={{ backgroundColor: isDark ? '#18181b' : '#f3f4f6' }}
        >
          <View className="flex-1">
            <Text
              className="font-medium"
              style={{ color: isDark ? '#fff' : '#111' }}
            >
              Set {index + 1}
            </Text>
            <Text
              className="text-sm"
              style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
            >
              {set.weight && `${set.weight} lbs`}
              {set.reps && ` × ${set.reps} reps`}
              {set.time && ` × ${Math.round(set.time / 60)} min`}
              {set.distance && ` × ${set.distance} mi`}
              {set.notes && ` - ${set.notes}`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleRemoveSet(index)}
            className="p-1"
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={isDark ? '#ef4444' : '#dc2626'}
            />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  )}
</View>;
```

#### 2.1.2 Update Activity Creation Logic

**Update the handleSave function:**

```typescript
const handleSave = () => {
  const activity: Activity = {
    id: Date.now().toString(),
    date: date,
    type: selectedType,
    name: name.trim() || undefined,
    emoji: selectedEmoji,
    notes: notes.trim() || undefined,
    sets: sets, // Add the sets to the activity
    completed: false,
  };

  dispatch(addActivity(activity));
  navigation.goBack();
};
```

### 2.2 Enhanced Activity Name Input with Suggestions

#### 2.2.1 Create ActivityNameInput Component

**Create new file:** `components/ActivityNameInput.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
} from 'react-native';
import { ActivityType } from '../types/activity';
import { ExerciseDefinition } from '../constants/exercises';
import { getAllExercises, addCustomExercise } from '../utils/storage';
import { toTitleCase } from '../utils/storage';

interface ActivityNameInputProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  activityType?: ActivityType;
  isDark?: boolean;
}

export default function ActivityNameInput({
  value,
  onValueChange,
  placeholder = 'Enter activity name...',
  activityType,
  isDark = false,
}: ActivityNameInputProps) {
  const [exercises, setExercises] = useState<ExerciseDefinition[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<ExerciseDefinition[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchText, setSearchText] = useState(value);
  const [showAddOption, setShowAddOption] = useState(false);

  useEffect(() => {
    loadExercises();
  }, []);

  useEffect(() => {
    if (searchText) {
      const filtered = exercises.filter(exercise =>
        exercise.name.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredExercises(filtered);
      setShowAddOption(filtered.length === 0 && searchText.trim().length > 0);
    } else {
      setFilteredExercises([]);
      setShowAddOption(false);
    }
  }, [searchText, exercises]);

  const loadExercises = async () => {
    const allExercises = await getAllExercises();
    if (activityType) {
      const typeFiltered = allExercises.filter(
        exercise => exercise.type === activityType
      );
      setExercises(typeFiltered);
    } else {
      setExercises(allExercises);
    }
  };

  const handleSelectExercise = (exercise: ExerciseDefinition) => {
    onValueChange(exercise.name);
    setSearchText(exercise.name);
    setIsModalVisible(false);
  };

  const handleAddNewExercise = async () => {
    const exerciseName = toTitleCase(searchText.trim());

    if (!exerciseName) {
      return;
    }

    // Check if exercise already exists
    const exists = exercises.some(
      ex => ex.name.toLowerCase() === exerciseName.toLowerCase()
    );
    if (exists) {
      return;
    }

    // Create new exercise with default values
    const newExercise: ExerciseDefinition = {
      name: exerciseName,
      type: activityType || 'weight-training',
      category: 'Compound',
      muscleGroups: ['Full Body'],
      equipment: ['None'],
      difficulty: 'Beginner',
      description: `Custom exercise: ${exerciseName}`,
    };

    try {
      await addCustomExercise(newExercise);
      await loadExercises();
      handleSelectExercise(newExercise);
    } catch (error) {
      console.error('Failed to add exercise:', error);
    }
  };

  const renderExerciseItem = ({ item }: { item: ExerciseDefinition }) => (
    <TouchableOpacity
      style={[styles.exerciseItem, { backgroundColor: isDark ? '#18181b' : '#fff' }]}
      onPress={() => handleSelectExercise(item)}
    >
      <Text style={[styles.exerciseName, { color: isDark ? '#fff' : '#111' }]}>
        {item.name}
      </Text>
      <Text style={[styles.exerciseCategory, { color: isDark ? '#a3a3a3' : '#6b7280' }]}>
        {item.category}
      </Text>
    </TouchableOpacity>
  );

  const renderAddOption = () => (
    <TouchableOpacity
      style={[styles.exerciseItem, styles.addOption, { backgroundColor: isDark ? '#1e40af' : '#dbeafe' }]}
      onPress={handleAddNewExercise}
    >
      <Text style={[styles.addOptionText, { color: isDark ? '#fff' : '#1e40af' }]}>
        + Add "{searchText}"
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, {
          color: isDark ? '#fff' : '#111',
          backgroundColor: isDark ? '#18181b' : '#fff',
          borderColor: isDark ? '#222' : '#d1d5db',
        }]}
        value={searchText}
        onChangeText={(text) => {
          setSearchText(text);
          onValueChange(text);
        }}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#a3a3a3' : '#6b7280'}
        onFocus={() => setIsModalVisible(true)}
      />

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#111' : '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#111' }]}>
                Select Activity
              </Text>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={[styles.closeButtonText, { color: isDark ? '#fff' : '#111' }]}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.searchInput, {
                color: isDark ? '#fff' : '#111',
                backgroundColor: isDark ? '#18181b' : '#fff',
                borderColor: isDark ? '#222' : '#d1d5db',
              }]}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search activities..."
              placeholderTextColor={isDark ? '#a3a3a3' : '#6b7280'}
              autoFocus
            />

            <FlatList
              data={filteredExercises}
              renderItem={renderExerciseItem}
              keyExtractor={item => item.name}
              style={styles.exerciseList}
              ListFooterComponent={showAddOption ? renderAddOption : null}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 20,
  },
  exerciseList: {
    flex: 1,
  },
  exerciseItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  exerciseCategory: {
    fontSize: 14,
  },
  addOption: {
    borderBottomColor: 'transparent',
  },
  addOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
```

#### 2.2.2 Update ActivityScreen to Use New Component

**Replace the Activity Name section:**

```tsx
{
  /* Activity Name */
}
<View className="mb-6">
  <Text
    className="text-lg font-semibold mb-2"
    style={{ color: isDark ? '#fff' : '#111' }}
  >
    Activity Name
  </Text>
  <ActivityNameInput
    value={name}
    onValueChange={setName}
    placeholder="e.g., Bench Press, Squat, Yoga, etc."
    activityType={selectedType}
    isDark={isDark}
  />
</View>;
```

### 2.3 Update EditActivityScreen

**Apply the same changes as ActivityScreen:**

- Add set management functionality
- Replace activity name input with ActivityNameInput component
- Update all terminology

### 2.4 Update ActivityExecutionScreen

**Update to handle the new set structure:**

- Ensure it can display and edit sets properly
- Update all terminology

## Part 3: Testing Checklist

### 3.1 Terminology Updates

- [ ] All "workout" references changed to "activity"
- [ ] All UI text updated
- [ ] All function names updated
- [ ] All variable names updated
- [ ] All file names updated
- [ ] All import paths updated

### 3.2 New Features

- [ ] Set management works in activity creation
- [ ] Set management works in activity editing
- [ ] Activity name input shows suggestions
- [ ] Activity name input allows adding new activities
- [ ] Stats screen correctly counts activities by name
- [ ] All existing functionality still works

### 3.3 Data Migration

- [ ] Existing data loads correctly with new structure
- [ ] No data loss during refactoring
- [ ] Storage functions work with new naming

## Part 4: Implementation Order

1. **Start with types** - Update `types/workout.ts` → `types/activity.ts`
2. **Update Redux** - Rename and update `redux/workoutSlice.ts` → `redux/activitySlice.ts`
3. **Update store** - Update `redux/store.ts`
4. **Update storage** - Update `utils/storage.ts`
5. **Create new components** - `ActivityNameInput.tsx`
6. **Update screens one by one** - Start with ActivityScreen, then others
7. **Update navigation** - Update all navigation references
8. **Update constants** - Update all constant references
9. **Update documentation** - Update README and other docs
10. **Test thoroughly** - Ensure everything works as expected

## Notes

- **Backup your code** before starting this refactoring
- **Commit frequently** during the process
- **Test each file** after updating it
- **Use search and replace** carefully to avoid breaking things
- **Consider using a refactoring tool** if available in your IDE
- **The exercise definitions system** should remain largely unchanged as it's reference data
