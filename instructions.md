# Rhythm App - Frontend Setup Guide

## 📱 App Description

**Rhythm** is a mobile workout tracking app focused on consistency, habits, and routine. It allows users to:

- Schedule workouts on a weekly basis
- Log exercises with sets, reps, and weight
- Track recovery activities like sauna, yoga, and meditation
- View stats on workout frequency, muscle group volume, and recovery balance
- Use a built-in GPT-powered smart coach for planning and suggestions

The main view is a 7-day weekly interface that links to detailed daily logs. Users can assign emojis to workouts and categorize them for richer stats and visual feedback.

The initial version is **frontend-only**, using local storage to persist data. A full backend and API will be added post-MVP.

---

## ✅ Cleanup: Remove Default Expo Boilerplate

After creating the Expo project, delete or clear out the following default content:

- Clear the contents of `App.tsx`
- Remove or replace default components, styles, and images in `/assets`
- Delete any example files or comments not relevant to your app

Then proceed with styling and navigation setup.

## ✅ Styling Preference: Tailwind + Apple-like Design

This app uses **Tailwind-style utility classes** for styling instead of Material Design. This supports a more native iOS (Apple-like) aesthetic rather than Google's Material look.

Recommended library:

```bash
npm install nativewind
```

Then follow setup here:
https://www.nativewind.dev/quick-starts/expo

NativeWind allows Tailwind-style class names like:

```tsx
<View className="flex-1 justify-center items-center bg-white">
  <Text className="text-xl font-bold">Welcome to Rhythm</Text>
</View>
```

---

## 📁 Folder Structure

```
/rhythm
├── /assets             # Icons, fonts, images
├── /components         # Reusable UI components (e.g. DayCard, WorkoutChip)
├── /constants          # Colors, emoji maps, workout type lists
├── /navigation         # React Navigation setup
├── /redux              # Redux slices and store config
├── /screens            # Core screens (Weekly, Day, Stats, Coach)
│   ├── WeeklyScreen.tsx
│   ├── DayScreen.tsx
│   ├── WorkoutScreen.tsx
│   └── StatsScreen.tsx
├── /types              # Shared TypeScript interfaces (Workout, Exercise, etc.)
├── App.tsx             # Root entry with NavigationContainer
└── app.json            # Expo config
```

---

## 📦 Dependencies to Install

### Navigation

```bash
npx expo install @react-navigation/native
npx expo install react-native-screens react-native-safe-area-context
npx expo install @react-navigation/native-stack
```

### Redux

```bash
npm install @reduxjs/toolkit react-redux
```

### Date handling

```bash
npm install dayjs
```

### HTTP client

```bash
npm install axios
```

### UI Toolkit (optional)

```bash
npx expo install react-native-paper
```

### Icons

- Already included via `@expo/vector-icons` in Expo

---

## 🧠 Core Data Structures

### 🧩 Emoji Icons

Icons for workouts and activities will use **standard emojis** for simplicity and personality. Users can select or assign an emoji when creating a workout.

Example emojis:

- 🏋️ for weight training
- 🧘 for yoga or mobility
- 🏃 for cardio
- 🛁 for sauna
- 🧊 for cold plunge
- 🛌 for recovery
- ⛳ for golf
- 🏀 for basketball
- 🎯 for custom goals or skills

```ts
// /types/workout.ts

export type WorkoutType =
  | 'weight-training'
  | 'bodyweight'
  | 'cardio'
  | 'mobility'
  | 'recovery'
  | 'sports'
  | 'other';

export interface Workout {
  id: string;
  date: string;
  type: WorkoutType;
  name?: string;
  emoji?: string;
  completed: boolean;
  notes?: string;
  exercises?: Exercise[];
}

export interface Exercise {
  id: string;
  workoutId: string;
  name: string;
  category: 'Push' | 'Pull' | 'Legs' | 'Core' | 'Full Body' | 'Custom';
  sets: {
    reps: number;
    weight: number;
    notes?: string;
  }[];
}
```

---

## 🗂 Key Screens (MVP)

- `WeeklyScreen` – 7-day scrollable/log view (main screen)
- `DayScreen` – view all workouts, exercises, and recovery for a single day
- `WorkoutScreen` – add/edit a specific workout (name, type, exercises)
- `StatsScreen` – view training breakdown, top lifts, recovery balance
- `CoachScreen` – GPT-powered workout assistant
- `WorkoutExecutionScreen` – simple view for performing a workout with:
  - Timer (start/pause/reset)
  - Set tracking (reps, weight, notes)
  - Navigation between exercises
  - Marking exercises as complete

Create a **basic functional version** of each screen in `/screens` like this:

```tsx
// Example: WeeklyScreen.tsx
import { View, Text } from 'react-native';

export default function WeeklyScreen() {
  return (
    <View>
      <Text>Weekly View</Text>
    </View>
  );
}
```

Repeat for all screens listed above.

### 🤖 GPT Integration Flow

- User chats with GPT about fitness goals, time commitment, preferences
- GPT proposes a training plan (e.g. 4-day upper/lower split)
- Once confirmed by user, GPT adds workouts directly to the weekly schedule for N weeks
- Workouts are stored in local state and displayed in `WeeklyScreen`

- User chats with GPT about fitness goals, time commitment, preferences
- GPT proposes a training plan (e.g. 4-day upper/lower split)
- Once confirmed by user, GPT adds workouts directly to the weekly schedule for N weeks
- Workouts are stored in local state and displayed in `WeeklyScreen`

(Initial Setup)

```ts
// App.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WeeklyScreen from './screens/WeeklyScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Weekly">
        <Stack.Screen name="Weekly" component={WeeklyScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

---

## 🧰 Redux Setup with Local Storage

### 1. **Create Redux Store**

```ts
// redux/store.ts
import { configureStore } from '@reduxjs/toolkit';
import workoutReducer from './workoutSlice';

export const store = configureStore({
  reducer: {
    workouts: workoutReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### 2. **Create a Slice**

```ts
// redux/workoutSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Workout } from '../types/workout';

interface WorkoutState {
  data: Workout[];
}

const initialState: WorkoutState = {
  data: [],
};

const workoutSlice = createSlice({
  name: 'workouts',
  initialState,
  reducers: {
    addWorkout(state, action: PayloadAction<Workout>) {
      state.data.push(action.payload);
    },
    updateWorkout(state, action: PayloadAction<Workout>) {
      const index = state.data.findIndex(w => w.id === action.payload.id);
      if (index !== -1) state.data[index] = action.payload;
    },
    deleteWorkout(state, action: PayloadAction<string>) {
      state.data = state.data.filter(w => w.id !== action.payload);
    },
    setWorkouts(state, action: PayloadAction<Workout[]>) {
      state.data = action.payload;
    },
  },
});

export const { addWorkout, updateWorkout, deleteWorkout, setWorkouts } =
  workoutSlice.actions;
export default workoutSlice.reducer;
```

### 3. **Wrap App in Provider**

```ts
// App.tsx
import { Provider } from 'react-redux';
import { store } from './redux/store';

export default function App() {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Weekly">
          <Stack.Screen name="Weekly" component={WeeklyScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
}
```

### 4. **Use Local Storage (AsyncStorage)**

Install:

```bash
npx expo install @react-native-async-storage/async-storage
```

Set up save/load:

```ts
// utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workout } from '../types/workout';

export const saveWorkouts = async (workouts: Workout[]) => {
  await AsyncStorage.setItem('workouts', JSON.stringify(workouts));
};

export const loadWorkouts = async (): Promise<Workout[]> => {
  const data = await AsyncStorage.getItem('workouts');
  return data ? JSON.parse(data) : [];
};
```

Then dispatch `setWorkouts()` after loading, and call `saveWorkouts()` when the state updates.

---

## 🧪 Next Steps (for follow-up planning only — do not implement now)

Keep track of the following for post-MVP and future iterations:

- Create basic functional versions of all core screens in `/screens`:

  ```tsx
  // Example: WeeklyScreen.tsx
  import { View, Text } from 'react-native';

  export default function WeeklyScreen() {
    return (
      <View>
        <Text>Weekly View</Text>
      </View>
    );
  }
  ```

  Repeat for `DayScreen.tsx`, `WorkoutScreen.tsx`, `StatsScreen.tsx`, `CoachScreen.tsx`

- Add screens to `Stack.Navigator` in `App.tsx`

  ```tsx
  <Stack.Navigator initialRouteName="Weekly">
    <Stack.Screen name="Weekly" component={WeeklyScreen} />
    <Stack.Screen name="Day" component={DayScreen} />
    <Stack.Screen name="Workout" component={WorkoutScreen} />
    <Stack.Screen name="Stats" component={StatsScreen} />
    <Stack.Screen name="Coach" component={CoachScreen} />
    <Stack.Screen name="WorkoutExecution" component={WorkoutExecutionScreen} />
  </Stack.Navigator>
  ```

- Build 7-day view UI in `WeeklyScreen`
- Add navigation to `DayScreen` on day tap
- Connect Redux store to manage workouts and logs
- Persist state to AsyncStorage

Next steps:

- Add/build backend + API in post-MVP
- Apple watch app and apple health integration
