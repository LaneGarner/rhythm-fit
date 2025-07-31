# Rhythm App Feature Implementation Instructions

## ⚠️ CRITICAL INSTRUCTION

**DO NOT CHANGE ANYTHING ELSE IN THE APP EXCEPT WHAT IS EXPLICITLY SPECIFIED IN THESE INSTRUCTIONS. TAKE NO LIBERTIES. DO NOT REGENERATE ANY FILES OR MAJORLY CHANGE ANY UI BEYOND THE EXACT CHANGES DESCRIBED BELOW.**

**Follow these instructions to the letter without adding any additional features, UI changes, or modifications not explicitly mentioned.**

---

## Overview

This document contains detailed instructions for implementing new features in the Rhythm app. Each section provides step-by-step guidance with code examples and specific implementation details.

## Feature 1: Date Selection in New Activity Screen

### 1.1 Add Date Picker Component

**Location:** `screens/ActivityScreen.tsx`

**Objective:** Add a date picker that auto-populates to the current day or the day being created from, with the ability to change the date.

**Implementation Steps:**

1. **Add date state and imports:**

```typescript
// Add to imports at top
import { Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

// Add to state variables
const [selectedDate, setSelectedDate] = useState(
  date ? dayjs(date).toDate() : new Date()
);
const [showDatePicker, setShowDatePicker] = useState(false);
```

2. **Add date picker handler:**

```typescript
const handleDateChange = (event: any, selectedDate?: Date) => {
  setShowDatePicker(false);
  if (selectedDate) {
    setSelectedDate(selectedDate);
  }
};

const showDatePickerModal = () => {
  setShowDatePicker(true);
};
```

3. **Add date selection UI after Activity Name section:**

```typescript
{/* Date Selection */}
<View>
  <Text
    className={`text-lg font-semibold mb-2 ${
      isDark ? 'text-white' : 'text-gray-900'
    }`}
  >
    Date
  </Text>
  <TouchableOpacity
    onPress={showDatePickerModal}
    className={`px-4 py-3 border rounded-lg flex-row justify-between items-center ${
      isDark
        ? 'bg-gray-800 border-gray-600'
        : 'bg-white border-gray-300'
    }`}
  >
    <Text
      className={`text-base ${
        isDark ? 'text-white' : 'text-gray-900'
      }`}
    >
      {dayjs(selectedDate).format('dddd, MMMM D, YYYY')}
    </Text>
    <Ionicons
      name="calendar-outline"
      size={20}
      color={isDark ? '#9CA3AF' : '#6B7280'}
    />
  </TouchableOpacity>
</View>
```

4. **Add date picker modal at the bottom of the component:**

```typescript
{/* Date Picker Modal */}
{showDatePicker && (
  <DateTimePicker
    value={selectedDate}
    mode="date"
    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
    onChange={handleDateChange}
    maximumDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)} // 1 year from now
    minimumDate={new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)} // 1 year ago
  />
)}
```

5. **Update handleSave function:**

```typescript
const newActivity: Activity = {
  id: Date.now().toString(),
  date: dayjs(selectedDate).format('YYYY-MM-DD'), // Use selected date
  type: activityType as any,
  name: activityName.trim(),
  emoji: selectedEmoji,
  completed: false,
  notes: notes.trim() || undefined,
  sets: [],
};
```

6. **Install required dependency:**

```bash
npm install @react-native-community/datetimepicker
```

## Feature 2: Add + Button to Week View

### 2.1 Add Floating Action Button to WeeklyScreen

**Location:** `screens/WeeklyScreen.tsx`

**Objective:** Add a + button in the same position as the day view, defaulting to today's date.

**Implementation Steps:**

1. **Add floating action button before closing View tag:**

```typescript
{/* Floating Add Button */}
<TouchableOpacity
  onPress={() => navigation.navigate('Activity', { date: dayjs().format('YYYY-MM-DD') })}
  style={{
    position: 'absolute',
    bottom: 102,
    right: 34,
    backgroundColor: '#2563eb',
    borderRadius: 32,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  }}
  activeOpacity={0.85}
  accessibilityLabel="Add Activity"
>
  <Ionicons name="add" size={32} color="#fff" />
</TouchableOpacity>
```

## Feature 3: Recurring Activity Options

### 3.1 Design Recurring Activity System

**Objective:** Create a flexible recurring activity system with various patterns.

**Recurring Patterns to Support:**

- Every day
- Once per week on specific day(s)
- Multiple days per week (e.g., Monday and Wednesday)
- Every Monday and Wednesday (recurring)
- This Monday and Wednesday (one-time)

### 3.2 Add Recurring Types

**Location:** `types/activity.ts`

**Add new types:**

```typescript
export type RecurringPattern = 'daily' | 'weekly' | 'custom';

export type RecurringFrequency = 'every' | 'this'; // for "this Monday" vs "every Monday"

export interface RecurringConfig {
  pattern: RecurringPattern;
  frequency: RecurringFrequency;
  daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc.
  startDate: string;
  endDate?: string;
  occurrences?: number; // number of times to repeat
}

export interface Activity {
  id: string;
  date: string;
  type: ActivityType;
  name: string;
  emoji?: string;
  completed: boolean;
  notes?: string;
  sets?: SetData[];
  recurring?: RecurringConfig; // Add this field
}
```

### 3.3 Create RecurringActivityModal Component

**Create new file:** `components/RecurringActivityModal.tsx`

```typescript
import React, { useContext, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { ThemeContext } from '../theme/ThemeContext';
import { RecurringConfig, RecurringPattern, RecurringFrequency } from '../types/activity';
import dayjs from 'dayjs';

interface RecurringActivityModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (config: RecurringConfig) => void;
  startDate: string;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

export default function RecurringActivityModal({
  visible,
  onClose,
  onSave,
  startDate,
}: RecurringActivityModalProps) {
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  const [pattern, setPattern] = useState<RecurringPattern>('weekly');
  const [frequency, setFrequency] = useState<RecurringFrequency>('every');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [occurrences, setOccurrences] = useState<string>('4');

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSave = () => {
    const config: RecurringConfig = {
      pattern,
      frequency,
      daysOfWeek: pattern === 'weekly' ? selectedDays : undefined,
      startDate,
      occurrences: parseInt(occurrences) || 4,
    };
    onSave(config);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        {/* Header */}
        <View className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <View className="flex-row justify-between items-center">
            <TouchableOpacity onPress={onClose}>
              <Text className={`text-lg ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Recurring Activity
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text className={`text-lg font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Pattern Selection */}
          <View className="mb-6">
            <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Pattern
            </Text>
            <View className="space-y-2">
              <TouchableOpacity
                onPress={() => setPattern('daily')}
                className={`p-3 rounded-lg border-2 ${
                  pattern === 'daily'
                    ? 'border-blue-500 bg-blue-50'
                    : isDark
                      ? 'border-gray-600 bg-gray-800'
                      : 'border-gray-300 bg-white'
                }`}
              >
                <Text className={`text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Every day
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPattern('weekly')}
                className={`p-3 rounded-lg border-2 ${
                  pattern === 'weekly'
                    ? 'border-blue-500 bg-blue-50'
                    : isDark
                      ? 'border-gray-600 bg-gray-800'
                      : 'border-gray-300 bg-white'
                }`}
              >
                <Text className={`text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Weekly on specific days
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Frequency Selection (for weekly pattern) */}
          {pattern === 'weekly' && (
            <View className="mb-6">
              <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Frequency
              </Text>
              <View className="space-y-2">
                <TouchableOpacity
                  onPress={() => setFrequency('every')}
                  className={`p-3 rounded-lg border-2 ${
                    frequency === 'every'
                      ? 'border-blue-500 bg-blue-50'
                      : isDark
                        ? 'border-gray-600 bg-gray-800'
                        : 'border-gray-300 bg-white'
                  }`}
                >
                  <Text className={`text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Every week
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFrequency('this')}
                  className={`p-3 rounded-lg border-2 ${
                    frequency === 'this'
                      ? 'border-blue-500 bg-blue-50'
                      : isDark
                        ? 'border-gray-600 bg-gray-800'
                        : 'border-gray-300 bg-white'
                  }`}
                >
                  <Text className={`text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    This week only
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Day Selection (for weekly pattern) */}
          {pattern === 'weekly' && (
            <View className="mb-6">
              <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Days of Week
              </Text>
              <View className="space-y-2">
                {DAYS_OF_WEEK.map(day => (
                  <TouchableOpacity
                    key={day.value}
                    onPress={() => toggleDay(day.value)}
                    className={`p-3 rounded-lg border-2 ${
                      selectedDays.includes(day.value)
                        ? 'border-blue-500 bg-blue-50'
                        : isDark
                          ? 'border-gray-600 bg-gray-800'
                          : 'border-gray-300 bg-white'
                    }`}
                  >
                    <Text className={`text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Occurrences */}
          <View className="mb-6">
            <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Number of Occurrences
            </Text>
            <TextInput
              value={occurrences}
              onChangeText={setOccurrences}
              keyboardType="numeric"
              className={`px-3 py-2 border rounded-lg ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="4"
              placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
```

### 3.4 Integrate Recurring Modal into ActivityScreen

**Location:** `screens/ActivityScreen.tsx`

**Add to imports:**

```typescript
import RecurringActivityModal from '../components/RecurringActivityModal';
```

**Add state:**

```typescript
const [showRecurringModal, setShowRecurringModal] = useState(false);
const [recurringConfig, setRecurringConfig] = useState<RecurringConfig | null>(
  null
);
```

**Add recurring button after Notes section:**

```typescript
{/* Recurring Options */}
<View>
  <Text
    className={`text-lg font-semibold mb-2 ${
      isDark ? 'text-white' : 'text-gray-900'
    }`}
  >
    Recurring
  </Text>
  <TouchableOpacity
    onPress={() => setShowRecurringModal(true)}
    className={`px-4 py-3 border rounded-lg flex-row justify-between items-center ${
      isDark
        ? 'bg-gray-800 border-gray-600'
        : 'bg-white border-gray-300'
    }`}
  >
    <Text
      className={`text-base ${
        isDark ? 'text-white' : 'text-gray-900'
      }`}
    >
      {recurringConfig
        ? `${recurringConfig.pattern === 'daily' ? 'Every day' : 'Weekly'} (${recurringConfig.occurrences} times)`
        : 'Set up recurring schedule'
      }
    </Text>
    <Ionicons
      name="repeat-outline"
      size={20}
      color={isDark ? '#9CA3AF' : '#6B7280'}
    />
  </TouchableOpacity>
</View>
```

**Add modal at bottom:**

```typescript
<RecurringActivityModal
  visible={showRecurringModal}
  onClose={() => setShowRecurringModal(false)}
  onSave={setRecurringConfig}
  startDate={dayjs(selectedDate).format('YYYY-MM-DD')}
/>
```

**Update handleSave to create recurring activities:**

```typescript
const createRecurringActivities = (
  baseActivity: Activity,
  config: RecurringConfig
): Activity[] => {
  const activities: Activity[] = [];

  if (config.pattern === 'daily') {
    for (let i = 0; i < config.occurrences!; i++) {
      const activityDate = dayjs(config.startDate).add(i, 'day');
      activities.push({
        ...baseActivity,
        id: `${baseActivity.id}_${i}`,
        date: activityDate.format('YYYY-MM-DD'),
        recurring: config,
      });
    }
  } else if (config.pattern === 'weekly') {
    let occurrenceCount = 0;
    let currentDate = dayjs(config.startDate);

    while (occurrenceCount < config.occurrences!) {
      const dayOfWeek = currentDate.day();

      if (config.daysOfWeek?.includes(dayOfWeek)) {
        activities.push({
          ...baseActivity,
          id: `${baseActivity.id}_${occurrenceCount}`,
          date: currentDate.format('YYYY-MM-DD'),
          recurring: config,
        });
        occurrenceCount++;
      }

      currentDate = currentDate.add(1, 'day');

      // Safety check to prevent infinite loop
      if (currentDate.diff(dayjs(config.startDate), 'day') > 365) {
        break;
      }
    }
  }

  return activities;
};

const handleSave = () => {
  // ... validation code ...

  const baseActivity: Activity = {
    id: Date.now().toString(),
    date: dayjs(selectedDate).format('YYYY-MM-DD'),
    type: activityType as any,
    name: activityName.trim(),
    emoji: selectedEmoji,
    completed: false,
    notes: notes.trim() || undefined,
    sets: [],
  };

  if (recurringConfig) {
    const recurringActivities = createRecurringActivities(
      baseActivity,
      recurringConfig
    );
    recurringActivities.forEach(activity => {
      dispatch(addActivity(activity));
    });
  } else {
    dispatch(addActivity(baseActivity));
  }

  navigation.goBack();
};
```

## Feature 4: Enhanced Activity Name Input with Recent Workouts

### 4.1 Update ActivityNameInput Component

**Location:** `components/ActivityNameInput.tsx`

**Objective:** Always show suggestions including recent workouts.

**Implementation Steps:**

1. **Add recent activities to suggestions:**

```typescript
// Add to imports
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import dayjs from 'dayjs';

// Add inside component
const activities = useSelector((state: RootState) => state.activities.data);

// Update useEffect to include recent activities
useEffect(() => {
  if (localValue.trim().length > 0) {
    const results = searchExercises(localValue);
    const suggestionNames = results.map(ex => ex.name);

    // Add recent activities (last 30 days)
    const recentActivities = activities
      .filter(a => dayjs(a.date).isAfter(dayjs().subtract(30, 'day')))
      .map(a => a.name)
      .filter(
        name => name && name.toLowerCase().includes(localValue.toLowerCase())
      )
      .slice(0, 5); // Limit to 5 recent suggestions

    // Combine and deduplicate
    const allSuggestions = [
      ...new Set([...suggestionNames, ...recentActivities]),
    ];
    setSuggestions(allSuggestions);
    setShowSuggestions(allSuggestions.length > 0);

    // If the input matches a known exercise, auto-select type and emoji
    const exact = findExerciseByName(localValue.trim());
    if (exact && onSelectSuggestion) {
      onSelectSuggestion(exact.name, exact.type);
    }
  } else {
    // Show recent activities even when input is empty
    const recentActivities = activities
      .filter(a => dayjs(a.date).isAfter(dayjs().subtract(30, 'day')))
      .map(a => a.name)
      .filter(Boolean)
      .slice(0, 5);

    setSuggestions(recentActivities);
    setShowSuggestions(recentActivities.length > 0);
  }
}, [localValue, activities]);
```

2. **Update suggestion rendering to show recent indicator:**

```typescript
{suggestions.map((suggestion, index) => {
  const isRecent = activities.some(a =>
    a.name === suggestion &&
    dayjs(a.date).isAfter(dayjs().subtract(30, 'day'))
  );

  return (
    <TouchableOpacity
      key={index}
      onPress={() => handleSelectSuggestion(suggestion)}
      className={`px-4 py-3 border-b ${
        isDark
          ? 'border-gray-700 active:bg-gray-800'
          : 'border-gray-200 active:bg-gray-100'
      } ${isLast ? 'mb-4' : ''}`}
    >
      <View className="flex-row items-center justify-between">
        <Text
          className={`text-base ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
          style={{ lineHeight: 24, paddingVertical: 2 }}
        >
          {suggestion}
        </Text>
        {isRecent && (
          <Text
            className={`text-xs ${
              isDark ? 'text-blue-400' : 'text-blue-600'
            }`}
          >
            Recent
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
})}
```

## Feature 5: Update Activity Execution Screen

### 5.1 Fix Background Color

**Location:** `screens/ActivityExecutionScreen.tsx`

**Change background from blue to pure black:**

```typescript
// Update the main container background
<View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#F9FAFB' }}>
```

### 5.2 Remove Save Progress Button

**Remove the Save Progress button and keep only Complete Activity:**

```typescript
{/* Sticky Action Buttons */}
<View
  className={`absolute left-0 right-0 p-4 border-t ${
    isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
  }`}
  style={{
    bottom: isKeyboardVisible ? keyboardHeight : 0,
    zIndex: 1000,
  }}
>
  <TouchableOpacity
    onPress={handleCompleteActivity}
    className="bg-green-500 py-3 px-6 rounded-lg"
  >
    <Text className="text-white text-center font-semibold text-lg">
      Complete Activity
    </Text>
  </TouchableOpacity>
</View>
```

### 5.3 Fix Button Layout Shift

**Make timer buttons fixed size:**

```typescript
<View className="flex-row justify-center space-x-4">
  {!isTimerRunning ? (
    <TouchableOpacity
      onPress={handleStartTimer}
      className="bg-green-500 px-6 py-2 rounded-lg"
      style={{ minWidth: 80, alignItems: 'center' }}
    >
      <Text className="text-white font-semibold">Start</Text>
    </TouchableOpacity>
  ) : (
    <TouchableOpacity
      onPress={handlePauseTimer}
      className="bg-yellow-500 px-6 py-2 rounded-lg"
      style={{ minWidth: 80, alignItems: 'center' }}
    >
      <Text className="text-white font-semibold">Pause</Text>
    </TouchableOpacity>
  )}
  <TouchableOpacity
    onPress={handleResetTimer}
    className="bg-red-500 px-6 py-2 rounded-lg"
    style={{ minWidth: 80, alignItems: 'center' }}
  >
    <Text className="text-white font-semibold">Reset</Text>
  </TouchableOpacity>
</View>
```

### 5.4 Reorder Set Inputs (Weight Before Reps)

**Update the set input order:**

```typescript
<View className="flex-row space-x-4">
  <View className="flex-1">
    <Text
      className={`text-sm mb-1 ${
        isDark ? 'text-gray-300' : 'text-gray-600'
      }`}
    >
      Weight (lbs)
    </Text>
    <TextInput
      value={set.weight?.toString() || ''}
      onChangeText={text =>
        handleUpdateSet(set.id, { weight: parseInt(text) || 0 })
      }
      keyboardType="numeric"
      className={`px-3 py-2 border rounded-lg ${
        isDark
          ? 'bg-gray-700 border-gray-600 text-white'
          : 'bg-white border-gray-300 text-gray-900'
      }`}
      placeholder="0"
      placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
      returnKeyType="next"
      blurOnSubmit={false}
    />
  </View>
  <View className="flex-1">
    <Text
      className={`text-sm mb-1 ${
        isDark ? 'text-gray-300' : 'text-gray-600'
      }`}
    >
      Reps
    </Text>
    <TextInput
      value={set.reps?.toString() || ''}
      onChangeText={text =>
        handleUpdateSet(set.id, { reps: parseInt(text) || 0 })
      }
      keyboardType="numeric"
      className={`px-3 py-2 border rounded-lg ${
        isDark
          ? 'bg-gray-700 border-gray-600 text-white'
          : 'bg-white border-gray-300 text-gray-900'
      }`}
      placeholder="0"
      placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
      returnKeyType="done"
      blurOnSubmit={true}
    />
  </View>
</View>
```

### 5.5 Add Keyboard Scroll Behavior

**Add scroll to input functionality:**

```typescript
// Add refs for set inputs
const setInputRefs = useRef<{ [key: string]: TextInput | null }>({});

// Add scroll function
const scrollToSetInput = (setId: string) => {
  const inputRef = setInputRefs.current[setId];
  if (inputRef && scrollViewRef.current) {
    inputRef.measureLayout(
      scrollViewRef.current as any,
      (x, y) => {
        scrollViewRef.current?.scrollTo({
          y: y - 100,
          animated: true,
        });
      },
      () => {
        console.log('Failed to measure set input position');
      }
    );
  }
};

// Update set rendering to include refs and onFocus
{sets.map((set, index) => (
  <View
    key={set.id}
    className={`p-4 rounded-lg mb-3 ${
      isDark ? 'bg-gray-800' : 'bg-white'
    } shadow-sm`}
  >
    {/* ... existing code ... */}
    <View className="flex-row space-x-4">
      <View className="flex-1">
        <Text
          className={`text-sm mb-1 ${
            isDark ? 'text-gray-300' : 'text-gray-600'
          }`}
        >
          Weight (lbs)
        </Text>
        <TextInput
          ref={ref => setInputRefs.current[set.id] = ref}
          value={set.weight?.toString() || ''}
          onChangeText={text =>
            handleUpdateSet(set.id, { weight: parseInt(text) || 0 })
          }
          keyboardType="numeric"
          className={`px-3 py-2 border rounded-lg ${
            isDark
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
          placeholder="0"
          placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
          returnKeyType="next"
          blurOnSubmit={false}
          onFocus={() => {
            setTimeout(() => {
              scrollToSetInput(set.id);
            }, 100);
          }}
        />
      </View>
      <View className="flex-1">
        <Text
          className={`text-sm mb-1 ${
            isDark ? 'text-gray-300' : 'text-gray-600'
          }`}
        >
          Reps
        </Text>
        <TextInput
          value={set.reps?.toString() || ''}
          onChangeText={text =>
            handleUpdateSet(set.id, { reps: parseInt(text) || 0 })
          }
          keyboardType="numeric"
          className={`px-3 py-2 border rounded-lg ${
            isDark
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
          placeholder="0"
          placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
          returnKeyType="done"
          blurOnSubmit={true}
          onFocus={() => {
            setTimeout(() => {
              scrollToSetInput(set.id);
            }, 100);
          }}
        />
      </View>
    </View>
    {/* ... rest of set code ... */}
  </View>
))}
```

## Feature 6: Create Shared Activity Form Component

### 6.1 Create ActivityForm Component

**Create new file:** `components/ActivityForm.tsx`

**Objective:** Create a shared component for both new and edit activity screens.

```typescript
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSelector } from 'react-redux';
import ActivityNameInput from './ActivityNameInput';
import RecurringActivityModal from './RecurringActivityModal';
import { ACTIVITY_EMOJIS, ACTIVITY_TYPES } from '../constants';
import { RootState } from '../redux/store';
import { ThemeContext } from '../theme/ThemeContext';
import { Activity, ActivityType, RecurringConfig } from '../types/activity';

interface ActivityFormProps {
  mode: 'create' | 'edit';
  initialActivity?: Activity;
  onSave: (activity: Activity, recurringConfig?: RecurringConfig) => void;
  onCancel: () => void;
}

export default function ActivityForm({
  mode,
  initialActivity,
  onSave,
  onCancel,
}: ActivityFormProps) {
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  const [activityName, setActivityName] = useState(initialActivity?.name || '');
  const [activityType, setActivityType] = useState<ActivityType>(
    initialActivity?.type || 'weight-training'
  );
  const [selectedEmoji, setSelectedEmoji] = useState(initialActivity?.emoji || '');
  const [notes, setNotes] = useState(initialActivity?.notes || '');
  const [selectedDate, setSelectedDate] = useState(
    initialActivity?.date ? dayjs(initialActivity.date).toDate() : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringConfig, setRecurringConfig] = useState<RecurringConfig | null>(
    initialActivity?.recurring || null
  );
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const notesInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      'keyboardWillShow',
      e => {
        setIsKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHideListener = Keyboard.addListener(
      'keyboardWillHide',
      () => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

  const scrollToInput = (inputRef: React.RefObject<TextInput | null>) => {
    if (inputRef.current && scrollViewRef.current) {
      inputRef.current.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({
            y: y - 100,
            animated: true,
          });
        },
        () => {
          console.log('Failed to measure input position');
        }
      );
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
  };

  const handleSave = () => {
    // Validate required fields
    const newErrors: { [key: string]: string } = {};

    if (!activityName.trim()) {
      newErrors.name = 'Activity name is required';
    }

    if (!activityType) {
      newErrors.type = 'Activity type is required';
    }

    if (!selectedEmoji) {
      newErrors.emoji = 'Emoji is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const activity: Activity = {
      id: initialActivity?.id || Date.now().toString(),
      date: dayjs(selectedDate).format('YYYY-MM-DD'),
      type: activityType,
      name: activityName.trim(),
      emoji: selectedEmoji,
      completed: initialActivity?.completed || false,
      notes: notes.trim() || undefined,
      sets: initialActivity?.sets || [],
      recurring: recurringConfig || undefined,
    };

    onSave(activity, recurringConfig || undefined);
  };

  const handleNameSelect = (name: string, type?: string) => {
    setActivityName(name);
    if (type) {
      setActivityType(type as ActivityType);
      const defaultEmoji = ACTIVITY_EMOJIS[type as keyof typeof ACTIVITY_EMOJIS];
      if (defaultEmoji) {
        setSelectedEmoji(defaultEmoji);
      }
    }
  };

  const handleAddToLibrary = async (name: string) => {
    // This would need to be implemented based on your storage utilities
    console.log('Add to library:', name);
  };

  const isSaveDisabled = !activityName.trim() || !activityType || !selectedEmoji;

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#F9FAFB' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 72,
          paddingBottom: 16,
          paddingHorizontal: 16,
          backgroundColor: isDark ? '#111' : '#fff',
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#222' : '#e5e7eb',
        }}
      >
        <TouchableOpacity
          hitSlop={14}
          onPress={onCancel}
          style={{ paddingVertical: 4, paddingHorizontal: 8, marginRight: 8 }}
        >
          <Text style={{ color: '#2563eb', fontSize: 18, fontWeight: '500' }}>
            Back
          </Text>
        </TouchableOpacity>
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 66,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: 'bold',
              color: isDark ? '#fff' : '#111',
              textAlign: 'center',
            }}
          >
            {mode === 'create' ? 'New Activity' : 'Edit Activity'}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: isKeyboardVisible ? keyboardHeight + 100 : 200,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        ref={scrollViewRef}
      >
        <View className="p-4 space-y-8">
          {/* Activity Name */}
          <View>
            <Text
              className={`text-lg font-semibold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Activity Name *
            </Text>
            <ActivityNameInput
              value={activityName}
              onChangeText={setActivityName}
              onSelectSuggestion={handleNameSelect}
              onAddToLibrary={handleAddToLibrary}
              placeholder="e.g., Bench Press, Yoga, Basketball"
              error={errors.name}
            />
          </View>

          {/* Date Selection */}
          <View>
            <Text
              className={`text-lg font-semibold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Date
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className={`px-4 py-3 border rounded-lg flex-row justify-between items-center ${
                isDark
                  ? 'bg-gray-800 border-gray-600'
                  : 'bg-white border-gray-300'
              }`}
            >
              <Text
                className={`text-base ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                {dayjs(selectedDate).format('dddd, MMMM D, YYYY')}
              </Text>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={isDark ? '#9CA3AF' : '#6B7280'}
              />
            </TouchableOpacity>
          </View>

          {/* Activity Type */}
          <View>
            <Text
              className={`text-lg font-semibold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Activity Type *
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {ACTIVITY_TYPES.map(type => (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => setActivityType(type.value as ActivityType)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor:
                      activityType === type.value
                        ? isDark
                          ? '#6366f1'
                          : '#a5b4fc'
                        : isDark
                          ? '#444'
                          : '#d1d5db',
                    backgroundColor:
                      activityType === type.value
                        ? isDark
                          ? '#23263a'
                          : '#e0e7ff'
                        : isDark
                          ? '#1a1a1a'
                          : '#fff',
                  }}
                >
                  <Text
                    className={`text-base ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {type.emoji} {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.type && (
              <Text className="text-red-500 text-sm mt-1">{errors.type}</Text>
            )}
          </View>

          {/* Emoji Selection */}
          <View>
            <Text
              className={`text-lg font-semibold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Emoji *
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {Object.entries(ACTIVITY_EMOJIS).map(([type, emoji]) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setSelectedEmoji(emoji)}
                  className={`p-3 rounded-lg border-2 ${
                    selectedEmoji === emoji
                      ? 'border-blue-500 bg-blue-50'
                      : isDark
                        ? 'border-gray-600 bg-gray-800'
                        : 'border-gray-300 bg-white'
                  }`}
                >
                  <Text className="text-2xl">{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.emoji && (
              <Text className="text-red-500 text-sm mt-1">{errors.emoji}</Text>
            )}
          </View>

          {/* Recurring Options */}
          <View>
            <Text
              className={`text-lg font-semibold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Recurring
            </Text>
            <TouchableOpacity
              onPress={() => setShowRecurringModal(true)}
              className={`px-4 py-3 border rounded-lg flex-row justify-between items-center ${
                isDark
                  ? 'bg-gray-800 border-gray-600'
                  : 'bg-white border-gray-300'
              }`}
            >
              <Text
                className={`text-base ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                {recurringConfig
                  ? `${recurringConfig.pattern === 'daily' ? 'Every day' : 'Weekly'} (${recurringConfig.occurrences} times)`
                  : 'Set up recurring schedule'
                }
              </Text>
              <Ionicons
                name="repeat-outline"
                size={20}
                color={isDark ? '#9CA3AF' : '#6B7280'}
              />
            </TouchableOpacity>
          </View>

          {/* Notes */}
          <View>
            <Text
              className={`text-lg font-semibold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Notes
            </Text>
            <TextInput
              ref={notesInputRef}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional notes about this activity"
              placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              multiline
              numberOfLines={3}
              className={`px-4 py-3 border rounded-lg text-base ${
                isDark
                  ? 'bg-gray-800 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit={true}
              onFocus={() => {
                setTimeout(() => {
                  scrollToInput(notesInputRef);
                }, 100);
              }}
            />
          </View>
        </View>
      </ScrollView>

      {/* Sticky Save Button */}
      <View
        className={`absolute left-0 right-0 p-4 border-t ${
          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}
        style={{
          bottom: isKeyboardVisible ? keyboardHeight : 0,
          zIndex: 1000,
        }}
      >
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaveDisabled}
          className={`py-3 px-6 rounded-lg ${
            isSaveDisabled ? 'bg-gray-400' : 'bg-blue-500 active:bg-blue-600'
          }`}
        >
          <Text className="text-white text-center font-semibold text-lg">
            {mode === 'create' ? 'Save Activity' : 'Update Activity'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)}
          minimumDate={new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)}
        />
      )}

      {/* Recurring Modal */}
      <RecurringActivityModal
        visible={showRecurringModal}
        onClose={() => setShowRecurringModal(false)}
        onSave={setRecurringConfig}
        startDate={dayjs(selectedDate).format('YYYY-MM-DD')}
      />
    </View>
  );
}
```

### 6.2 Update ActivityScreen to Use Shared Component

**Location:** `screens/ActivityScreen.tsx`

**Replace entire component content with:**

```typescript
import React from 'react';
import { useDispatch } from 'react-redux';
import { addActivity } from '../redux/activitySlice';
import ActivityForm from '../components/ActivityForm';
import { Activity, RecurringConfig } from '../types/activity';
import dayjs from 'dayjs';

export default function ActivityScreen({ navigation, route }: any) {
  const { date } = route.params || {};
  const dispatch = useDispatch();

  const createRecurringActivities = (baseActivity: Activity, config: RecurringConfig): Activity[] => {
    const activities: Activity[] = [];

    if (config.pattern === 'daily') {
      for (let i = 0; i < config.occurrences!; i++) {
        const activityDate = dayjs(config.startDate).add(i, 'day');
        activities.push({
          ...baseActivity,
          id: `${baseActivity.id}_${i}`,
          date: activityDate.format('YYYY-MM-DD'),
          recurring: config,
        });
      }
    } else if (config.pattern === 'weekly') {
      let occurrenceCount = 0;
      let currentDate = dayjs(config.startDate);

      while (occurrenceCount < config.occurrences!) {
        const dayOfWeek = currentDate.day();

        if (config.daysOfWeek?.includes(dayOfWeek)) {
          activities.push({
            ...baseActivity,
            id: `${baseActivity.id}_${occurrenceCount}`,
            date: currentDate.format('YYYY-MM-DD'),
            recurring: config,
          });
          occurrenceCount++;
        }

        currentDate = currentDate.add(1, 'day');

        // Safety check to prevent infinite loop
        if (currentDate.diff(dayjs(config.startDate), 'day') > 365) {
          break;
        }
      }
    }

    return activities;
  };

  const handleSave = (activity: Activity, recurringConfig?: RecurringConfig) => {
    if (recurringConfig) {
      const recurringActivities = createRecurringActivities(activity, recurringConfig);
      recurringActivities.forEach(activity => {
        dispatch(addActivity(activity));
      });
    } else {
      dispatch(addActivity(activity));
    }

    navigation.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <ActivityForm
      mode="create"
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
```

### 6.3 Update EditActivityScreen to Use Shared Component

**Location:** `screens/EditActivityScreen.tsx`

**Replace entire component content with:**

```typescript
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateActivity } from '../redux/activitySlice';
import { RootState } from '../redux/store';
import ActivityForm from '../components/ActivityForm';
import { Activity, RecurringConfig } from '../types/activity';

export default function EditActivityScreen({ navigation, route }: any) {
  const { activityId } = route.params;
  const dispatch = useDispatch();

  const activities = useSelector((state: RootState) => state.activities.data);
  const activity = activities.find(a => a.id === activityId);

  const handleSave = (updatedActivity: Activity, recurringConfig?: RecurringConfig) => {
    if (!activity) return;

    const finalActivity: Activity = {
      ...updatedActivity,
      id: activity.id, // Preserve original ID
      completed: activity.completed, // Preserve completion status
      recurring: recurringConfig || undefined,
    };

    dispatch(updateActivity(finalActivity));
    navigation.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (!activity) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-lg">Activity not found</Text>
      </View>
    );
  }

  return (
    <ActivityForm
      mode="edit"
      initialActivity={activity}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
```

## Implementation Order

1. **Start with Feature 1** - Add date picker to ActivityScreen
2. **Implement Feature 2** - Add + button to WeeklyScreen
3. **Implement Feature 4** - Update ActivityNameInput with recent activities
4. **Implement Feature 5** - Update ActivityExecutionScreen
5. **Implement Feature 3** - Add recurring activity system
6. **Finally implement Feature 6** - Create shared ActivityForm component

## Dependencies to Install

```bash
npm install @react-native-community/datetimepicker
```

## Testing Checklist

- [ ] Date picker works in new activity screen
- [ ] - button appears in week view and navigates correctly
- [ ] Activity name input shows recent activities
- [ ] Activity execution screen has pure black background
- [ ] Activity execution screen only shows "Complete Activity" button
- [ ] Timer buttons don't shift layout
- [ ] Set inputs show weight before reps
- [ ] Keyboard scrolls to focused inputs
- [ ] Recurring activities can be created
- [ ] Shared ActivityForm component works for both create and edit modes

---

**Remember: Follow these instructions exactly as written. Do not add any additional features or make any changes not explicitly specified above.**
