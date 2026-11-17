import type { Activity, WorkoutLocation } from '../types/activity';

export const watchWorkoutTypes = {
  strength: 'Traditional strength training',
  walk: 'Outdoor walk',
  indoorWalk: 'Indoor walk',
  run: 'Outdoor run',
  indoorRun: 'Indoor run',
  outdoorCycle: 'Outdoor cycle',
  indoorCycle: 'Indoor cycle',
  ruck: 'Ruck',
} as const;

export type WatchWorkoutType = keyof typeof watchWorkoutTypes;

export function getCardioKind(name: string) {
  const words = name.toLowerCase();
  if (/\bruck(?:ing)?\b/.test(words)) return 'ruck';
  if (/\b(cycling|cycle|bike|biking|bicycle|peloton)\b/.test(words))
    return 'cycle';
  if (/\b(run|running|jog|jogging)\b/.test(words)) return 'run';
  if (/\b(walk|walking|treadmill)\b/.test(words)) return 'walk';
  return null;
}

export function inferWorkoutLocation(
  name: string
): WorkoutLocation | undefined {
  if (/\b(indoor|indoors|treadmill|stationary|peloton)\b/i.test(name))
    return 'indoor';
  if (/\b(outdoor|outdoors|outside)\b/i.test(name)) return 'outdoor';
  return undefined;
}

export function suggestWatchWorkout(
  activity: Activity,
  location = activity.workoutLocation ?? inferWorkoutLocation(activity.name)
): WatchWorkoutType | null {
  if (activity.type === 'weight-training' || activity.type === 'calisthenics')
    return 'strength';
  switch (getCardioKind(activity.name)) {
    case 'ruck':
      return 'ruck';
    case 'walk':
      return location === 'indoor'
        ? 'indoorWalk'
        : location === 'outdoor'
          ? 'walk'
          : null;
    case 'run':
      return location === 'indoor'
        ? 'indoorRun'
        : location === 'outdoor'
          ? 'run'
          : null;
    case 'cycle':
      return location === 'indoor'
        ? 'indoorCycle'
        : location === 'outdoor'
          ? 'outdoorCycle'
          : null;
    default:
      return null;
  }
}
