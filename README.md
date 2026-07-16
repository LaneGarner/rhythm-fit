# Rhythm — AI-Powered Workout Tracker & Coach

A React Native / Expo mobile app for tracking workouts, building consistency, and planning training with an AI coach. Works fully offline and optionally syncs to a private backend.

## Why it's interesting

Rhythm is built offline-first for real gym conditions: every mutation lands in AsyncStorage instantly, a sync middleware queues changes and reconciles with the server when a connection returns, and the app is fully usable with no backend at all. The AI coach streams responses (NDJSON) for planning workouts and generating multi-week programs. And accessibility is treated as a feature, not a checkbox — WCAG 2.2 AA touch targets, labels, and roles across the app's interactive elements.

## Screenshots

<!-- TODO: capture and add screenshots
  - Weekly planner (7-day view)
  - Day view with activities and supersets
  - Workout execution with the set-by-set timer
  - Stats / PRs screen
  - AI Coach streaming a program
  - Plate calculator
  - Light and dark theme side by side
-->

_Screenshots coming soon._

## Features

- **Weekly view**: 7-day planner with drag-to-reorder activities and quick day navigation
- **Activity tracking**: Weight training, calisthenics, cardio, mobility, recovery, and sports — each with sensible default tracking fields (weight, reps, time, distance, band)
- **Supersets**: Group activities and execute them back-to-back
- **Workout execution**: Guided set-by-set flow with a global timer (count up / count down) that survives backgrounding
- **Stats & PRs**: Frequency, streaks, per-exercise history, and personal records
- **AI Coach**: Plan workouts, ask training questions, and generate multi-week programs (streamed responses)
- **Offline-first**: All data persists to AsyncStorage instantly; background sync pushes to the server when online
- **Activity library & emoji picker**: Reusable activity templates
- **Calculator**: Plate math and common lift calculators
- **Tutorial / onboarding** with spotlight overlays
- **Light/dark theme** with custom theming via `ThemeContext`
- **Notifications** for reminders
- **Accessibility**: WCAG 2.2 AA touch targets, labels, and roles across interactive elements

## Tech Stack

**Frontend (this repo)**

- React Native (0.81) + Expo SDK 54
- TypeScript (strict)
- Redux Toolkit — single activity slice with AsyncStorage persistence
- React Navigation (native-stack + bottom-tabs)
- NativeWind (Tailwind) + inline dynamic theming
- Day.js for dates
- `react-native-gifted-charts`, `react-native-reanimated`, `react-native-gesture-handler`

**Backend (private, separate repo)**

- Node.js + Express + TypeScript, deployed on Railway
- Supabase (Postgres + Auth, Row Level Security)
- OpenAI GPT-5.2 for the AI coach (NDJSON streaming)
- Backend is optional — the app runs fully local without it

## Getting Started

```bash
npm install
npm start        # Expo dev server + QR code
npm run ios      # iOS simulator
npm run android  # Android emulator
```

### Environment variables (`.env`)

All are **optional** — without them, the app runs in local-only mode.

```
EXPO_PUBLIC_API_URL=              # Backend URL (enables sync + AI coach)
EXPO_PUBLIC_SUPABASE_URL=         # Supabase project URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anon key
```

Production builds use EAS environment variables, not local `.env`.

## Architecture

### Provider hierarchy (`App.tsx`)

```
GestureHandlerRootView
  └── Provider (Redux)
        └── ThemeProvider
              └── AuthProvider
                    └── PreferencesProvider
                          └── TimerProvider
                                └── WeekProvider
                                      └── TutorialProvider
                                            └── AppContent
```

### State

- **Redux Toolkit** (`redux/activitySlice.ts`) — all activities, auto-persisted to AsyncStorage on every mutation
- **Contexts** for UI/session state: `ThemeContext`, `WeekContext`, `AuthContext`, `PreferencesContext`, `TimerContext`, `TutorialContext`

### Data flow (offline-first sync)

1. App boot → `loadActivitiesFromStorage()` hydrates Redux from AsyncStorage
2. If authenticated → `syncActivities()` merges local ↔ server (newer `updated_at` wins)
3. User mutations → Redux dispatch → instant AsyncStorage write
4. `syncMiddleware` queues changes and pushes to the server asynchronously
5. Pending queue persisted to AsyncStorage and retried on network recovery
6. Soft deletes via `deleted_at` to avoid sync conflicts

### Navigation

- **Root stack**: Auth, Main (tabs), Activity, DemoActivityExecution, EditActivity, Settings, ActivityLibrary, EmojiLibrary, Equipment, ExerciseStats, PersonalRecords
- **Bottom tabs**: Weekly, Stats, Calculator, Coach
- **Weekly stack**: WeeklyHome → Day → ActivityExecution / SupersetExecution

## Project Structure

```
/rhythm
├── App.tsx
├── components/      # Reusable UI
├── constants/       # Colors, types, defaults
├── context/         # Theme, Auth, Preferences, Timer, Week, Tutorial
├── navigation/      # TabNavigator, WeeklyStackNavigator
├── redux/           # store + activitySlice + syncMiddleware
├── screens/         # Weekly, Day, Stats, Coach, Calculator, Activity, Settings, ...
├── services/        # API clients, sync, notifications
├── hooks/
├── lib/
├── utils/
├── theme/
├── types/           # activity.ts, preferences.ts
└── assets/
```

## Core Data Model

```typescript
type ActivityType =
  | 'weight-training'
  | 'calisthenics'
  | 'cardio'
  | 'mobility'
  | 'recovery'
  | 'sports'
  | 'other';

type TrackingField = 'weight' | 'reps' | 'time' | 'distance' | 'band';

interface Activity {
  id: string;
  date: string;
  type: ActivityType;
  name: string;
  completed: boolean;
  notes?: string;
  sets?: SetData[];
  recurring?: RecurringConfig;
  trackingFields?: TrackingField[];
  supersetId?: string;
  supersetPosition?: number;
  order?: number;
  updated_at?: string;
}

interface SetData {
  id: string;
  reps?: number;
  weight?: number;
  time?: number; // seconds
  distance?: number; // miles/km
  band?: string;
  notes?: string;
  completed: boolean;
}
```

## Code Style

- Prettier: single quotes, semicolons, 2-space indent, trailing commas ES5, no arrow parens
- Functional components with hooks, named exports preferred
- NativeWind classes + inline styles for dynamic theme values
- Skeleton loaders over spinners (spinners OK inside buttons)

```bash
npm run format         # write
npm run format:check   # check only
```
