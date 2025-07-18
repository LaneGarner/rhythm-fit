# Dev Mode Button Implementation Plan

## Overview

Add a red dev mode button in the top right of the app that can clear all data types. The button should be small, obvious that it's for development only, and easily hideable later.

## Data Types to Clear

Based on the app's storage structure, the button should clear:

1. **Activities (workout data)** - AsyncStorage key: `'activities'`
2. **Chat history** - AsyncStorage key: `'chat_history'`
3. **Custom exercises** - AsyncStorage key: `'customExercises'`
4. **Theme mode** - AsyncStorage key: `'themeMode'`
5. **Redux store state** - In-memory activities

## Implementation Plan

### Phase 1: Create Dev Mode Button Component

- Create `components/DevModeButton.tsx`
- Small red button with "DEV" text
- Position absolutely in top right
- Add clear confirmation dialog
- Include individual clear options

### Phase 2: Add Storage Clear Functions

- Extend `utils/storage.ts` with clear functions
- Add Redux action to clear store
- Add function to clear all data at once

### Phase 3: Integrate into App

- Add button to main App.tsx
- Position in top right corner
- Make it easily hideable with a flag

### Phase 4: Add Configuration

- Add dev mode flag for easy hiding
- Consider environment-based showing

---

## Detailed Implementation Instructions

### Step 1: Create Storage Clear Functions

**File: `utils/storage.ts`**

Add these functions to the existing storage utilities:

```typescript
// Clear all data functions
export const clearAllActivities = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('activities');
    console.log('All activities cleared from storage');
  } catch (error) {
    console.error('Error clearing activities:', error);
  }
};

export const clearChatHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('chat_history');
    console.log('Chat history cleared from storage');
  } catch (error) {
    console.error('Error clearing chat history:', error);
  }
};

export const clearCustomExercises = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('customExercises');
    console.log('Custom exercises cleared from storage');
  } catch (error) {
    console.error('Error clearing custom exercises:', error);
  }
};

export const clearThemeMode = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('themeMode');
    console.log('Theme mode cleared from storage');
  } catch (error) {
    console.error('Error clearing theme mode:', error);
  }
};

export const clearAllAppData = async (): Promise<void> => {
  try {
    await Promise.all([
      clearAllActivities(),
      clearChatHistory(),
      clearCustomExercises(),
      clearThemeMode(),
    ]);
    console.log('All app data cleared from storage');
  } catch (error) {
    console.error('Error clearing all app data:', error);
  }
};
```

### Step 2: Add Redux Clear Action

**File: `redux/activitySlice.ts`**

Add a new action to clear all activities from the Redux store:

```typescript
// Add this action to the existing slice
clearAllActivities: (state) => {
  state.activities = [];
  console.log('All activities cleared from Redux store');
},
```

Export the action:

```typescript
export const {
  addActivity,
  updateActivity,
  deleteActivity,
  loadActivities,
  clearAllActivities,
} = activitySlice.actions;
```

### Step 3: Create Dev Mode Button Component

**File: `components/DevModeButton.tsx`**

```typescript
import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../redux/store';
import { clearAllActivities as clearReduxActivities } from '../redux/activitySlice';
import {
  clearAllAppData,
  clearAllActivities,
  clearChatHistory,
  clearCustomExercises,
  clearThemeMode
} from '../utils/storage';

interface DevModeButtonProps {
  visible?: boolean;
}

const DevModeButton: React.FC<DevModeButtonProps> = ({ visible = true }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [isPressed, setIsPressed] = useState(false);

  if (!visible) return null;

  const showClearOptions = () => {
    Alert.alert(
      '🔧 DEV MODE',
      'Choose what to clear:',
      [
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: () => confirmClearAll(),
        },
        {
          text: 'Clear Activities Only',
          style: 'destructive',
          onPress: () => confirmClearActivities(),
        },
        {
          text: 'Clear Chat History Only',
          onPress: () => confirmClearChat(),
        },
        {
          text: 'Clear Custom Exercises',
          onPress: () => confirmClearExercises(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const confirmClearAll = () => {
    Alert.alert(
      '⚠️ CLEAR ALL DATA',
      'This will permanently delete ALL app data including activities, chat history, custom exercises, and settings. This cannot be undone.',
      [
        {
          text: 'DELETE EVERYTHING',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear storage
              await clearAllAppData();
              // Clear Redux
              dispatch(clearReduxActivities());
              Alert.alert('✅ Success', 'All app data has been cleared');
            } catch (error) {
              Alert.alert('❌ Error', 'Failed to clear all data');
              console.error('Error clearing all data:', error);
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const confirmClearActivities = () => {
    Alert.alert(
      '⚠️ CLEAR ACTIVITIES',
      'This will permanently delete all workout activities and progress. This cannot be undone.',
      [
        {
          text: 'DELETE ACTIVITIES',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllActivities();
              dispatch(clearReduxActivities());
              Alert.alert('✅ Success', 'All activities have been cleared');
            } catch (error) {
              Alert.alert('❌ Error', 'Failed to clear activities');
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const confirmClearChat = () => {
    Alert.alert(
      '⚠️ CLEAR CHAT HISTORY',
      'This will permanently delete all AI coach chat history.',
      [
        {
          text: 'DELETE CHAT',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearChatHistory();
              Alert.alert('✅ Success', 'Chat history has been cleared');
            } catch (error) {
              Alert.alert('❌ Error', 'Failed to clear chat history');
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const confirmClearExercises = () => {
    Alert.alert(
      '⚠️ CLEAR CUSTOM EXERCISES',
      'This will permanently delete all custom exercises you\'ve created.',
      [
        {
          text: 'DELETE EXERCISES',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearCustomExercises();
              Alert.alert('✅ Success', 'Custom exercises have been cleared');
            } catch (error) {
              Alert.alert('❌ Error', 'Failed to clear custom exercises');
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <View style={{
      position: 'absolute',
      top: 50, // Below status bar
      right: 16,
      zIndex: 1000,
    }}>
      <Pressable
        onPress={showClearOptions}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        style={{
          backgroundColor: isPressed ? '#dc2626' : '#ef4444', // Red colors
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 4,
          borderWidth: 1,
          borderColor: '#991b1b',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 3,
        }}
      >
        <Text style={{
          color: 'white',
          fontSize: 10,
          fontWeight: 'bold',
          letterSpacing: 0.5,
        }}>
          DEV
        </Text>
      </Pressable>
    </View>
  );
};

export default DevModeButton;
```

### Step 4: Integrate into App

**File: `App.tsx`**

Add the dev button to the main app:

```typescript
// Add import at the top
import DevModeButton from './components/DevModeButton';

// Add this constant near the top of the file (after imports)
const DEV_MODE_ENABLED = true; // Set to false to hide the button

// In the AppContent component, add the button after the NavigationContainer but before the closing fragment
function AppContent() {
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);

  // ... existing useEffect hooks ...

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Main"
          screenOptions={{
            headerShown: false,
          }}
        >
          {/* ... existing screens ... */}
        </Stack.Navigator>
      </NavigationContainer>

      {/* Add the dev mode button */}
      <DevModeButton visible={DEV_MODE_ENABLED} />
    </>
  );
}
```

### Step 5: Update Activity Slice (if needed)

**File: `redux/activitySlice.ts`**

If the `clearAllActivities` action doesn't exist, add it:

```typescript
// In the reducers section of activitySlice
clearAllActivities: (state) => {
  state.activities = [];
},
```

And export it:

```typescript
export const {
  addActivity,
  updateActivity,
  deleteActivity,
  loadActivities,
  clearAllActivities, // Add this
} = activitySlice.actions;
```

## Configuration Options

### Environment-Based Visibility

To automatically hide in production, you can modify the visibility check:

```typescript
// In App.tsx
const DEV_MODE_ENABLED = __DEV__; // Only show in development builds
```

### Feature Flag

For more control, you could add a feature flag system or make it configurable through settings.

## Usage

1. The button appears as a small red "DEV" button in the top right
2. Tapping it shows options to clear different types of data
3. Each clear action requires confirmation to prevent accidents
4. All operations log to console for debugging
5. Success/error alerts provide feedback

## To Hide Later

Simply change `DEV_MODE_ENABLED` to `false` in `App.tsx` or set it based on environment variables.

## Additional Dev Features to Consider

- Export data to JSON for debugging
- Import test data
- Reset to specific app states
- Performance monitoring toggle
- Debug info overlay
