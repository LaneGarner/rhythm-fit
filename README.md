# Rhythm - Workout Tracking App

A mobile workout tracking app focused on consistency, habits, and routine. Built with React Native, Expo, and TypeScript.

## Features

- **Weekly View**: 7-day interface showing planned and completed workouts
- **Workout Management**: Add, edit, and track workouts with custom emojis
- **Exercise Tracking**: Log exercises with sets, reps, and weight
- **Workout Execution**: Built-in timer and set tracking during workouts
- **Statistics**: View workout frequency, completion rates, and trends
- **AI Coach**: GPT-powered workout assistant for planning and motivation
- **Local Storage**: All data persists locally using AsyncStorage

## Tech Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **Redux Toolkit** for state management
- **React Navigation** for routing
- **NativeWind** (Tailwind CSS) for styling
- **Day.js** for date handling
- **AsyncStorage** for local data persistence

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm start
   ```

3. Run on iOS or Android:
   ```bash
   npm run ios
   # or
   npm run android
   ```

## App Structure

```
/rhythm
├── /components         # Reusable UI components
├── /constants          # Colors, emoji maps, workout types
├── /navigation         # React Navigation setup
├── /redux              # Redux slices and store
├── /screens            # Core app screens
├── /types              # TypeScript interfaces
├── /utils              # Storage utilities
└── App.tsx             # Root component
```

## Screens

- **WeeklyScreen**: Main 7-day view with workout cards
- **DayScreen**: Detailed view of workouts for a specific day
- **WorkoutScreen**: Add/edit workout details
- **WorkoutExecutionScreen**: Perform workouts with timer
- **StatsScreen**: Analytics and progress tracking
- **CoachScreen**: AI-powered fitness assistant

## Data Models

### Workout

```typescript
interface Workout {
  id: string;
  date: string;
  type: WorkoutType;
  name?: string;
  emoji?: string;
  completed: boolean;
  notes?: string;
  exercises?: Exercise[];
}
```

### Exercise

```typescript
interface Exercise {
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

## Future Enhancements

- Backend API integration
- Apple Health integration
- Apple Watch app
- Social features
- Advanced analytics
- Workout templates
- Progress photos
- Nutrition tracking

## Development

This is a frontend-only MVP using local storage. The backend and API will be added in future iterations.
