import dayjs from 'dayjs';
import { Activity, ActivityType, SetData } from '../types/activity';
import { isActivityComplete } from '../utils/supersetUtils';

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

// Exercise to muscle group mapping
export const EXERCISE_MUSCLE_MAP: Record<
  string,
  { primary: BodyPart; secondary: BodyPart[] }
> = {
  // Weight Training - Compound
  'bench press': { primary: 'chest', secondary: ['triceps', 'shoulders'] },
  'overhead press': { primary: 'shoulders', secondary: ['triceps', 'core'] },
  deadlift: { primary: 'back', secondary: ['hamstrings', 'glutes', 'core'] },
  squat: { primary: 'quadriceps', secondary: ['glutes', 'hamstrings', 'core'] },
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
  totalWeight: number;
  maxWeight: number;
  maxReps: number;
  totalTime: number;
  totalDistance: number;
  sessions: number;
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
  isPrimary: boolean;
}

// Personal Records
export interface PersonalRecord {
  exerciseName: string;
  maxWeight: number;
  maxWeightDate: string;
  maxReps: number;
  maxRepsDate: string;
  isNewWeightPR?: boolean;
  isNewRepsPR?: boolean;
}

export interface PersonalRecordsResult {
  records: PersonalRecord[];
  recentPRs: PersonalRecord[];
}

// Consistency Stats
export interface ConsistencyStats {
  daysPerWeek: number;
  longestGapDays: number;
  longestGapStart: string;
  longestGapEnd: string;
  bestWeek: {
    weekStart: string;
    sessions: number;
    totalVolume: number;
  };
}

// Activity Type Stats
export interface ActivityTypeStats {
  type: ActivityType;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
  'weight-training': '#3b82f6',
  calisthenics: '#22c55e',
  cardio: '#ef4444',
  mobility: '#a855f7',
  recovery: '#14b8a6',
  sports: '#f97316',
  other: '#6b7280',
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  'weight-training': 'Weight Training',
  calisthenics: 'Calisthenics',
  cardio: 'Cardio',
  mobility: 'Mobility',
  recovery: 'Recovery',
  sports: 'Sports',
  other: 'Other',
};

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
  const matchingActivities = activities.filter(
    a =>
      a.completed &&
      a.name.toLowerCase() === exerciseName.toLowerCase()
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

  const exerciseSessions: Record<string, Set<string>> = {};

  for (const activity of activities) {
    if (!isActivityComplete(activity) || !activity.sets) continue;

    const muscleGroups = getMuscleGroupsForExercise(activity.name);

    if (!muscleStats[muscleGroups.primary].exercises.includes(activity.name)) {
      muscleStats[muscleGroups.primary].exercises.push(activity.name);
    }

    if (!exerciseSessions[activity.name]) {
      exerciseSessions[activity.name] = new Set();
    }
    exerciseSessions[activity.name].add(activity.date);

    for (const set of activity.sets) {
      if (!set.completed) continue;

      muscleStats[muscleGroups.primary].totalSets += 1;
      muscleStats[muscleGroups.primary].isPrimary = true;
      if (set.weight && set.reps) {
        muscleStats[muscleGroups.primary].totalVolume += set.weight * set.reps;
      }

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

  for (const muscle of Object.keys(muscleStats) as BodyPart[]) {
    const dates = new Set<string>();
    for (const exercise of muscleStats[muscle].exercises) {
      if (exerciseSessions[exercise]) {
        exerciseSessions[exercise].forEach(date => dates.add(date));
      }
    }
    muscleStats[muscle].sessions = dates.size;
  }

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

  const completedActivities = recentActivities.filter(a => isActivityComplete(a));

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

  const { currentStreak, longestStreak } = calculateStreaks(activities);

  return {
    totalActivities: completedActivities.length,
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
    averagePerWeek: Math.round((completedActivities.length / daysRange) * 7),
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
  const completedDates = new Set<string>();
  for (const activity of activities) {
    if (isActivityComplete(activity)) {
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
    if (isActivityComplete(activity) && activity.name) {
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

/**
 * Calculate personal records for all exercises
 */
export function calculatePersonalRecords(
  activities: Activity[],
  timeRangeDays: number = 30
): PersonalRecordsResult {
  const exerciseRecords: Record<
    string,
    {
      maxWeight: number;
      maxWeightDate: string;
      maxReps: number;
      maxRepsDate: string;
      recentMaxWeight: number;
      recentMaxWeightDate: string;
      recentMaxReps: number;
      recentMaxRepsDate: string;
    }
  > = {};

  const now = dayjs();
  const recentCutoff = now.subtract(timeRangeDays, 'day');

  for (const activity of activities) {
    if (!isActivityComplete(activity) || !activity.sets) continue;

    const activityDate = dayjs(activity.date);
    const isRecent = activityDate.isAfter(recentCutoff);
    const exerciseName = activity.name;

    if (!exerciseRecords[exerciseName]) {
      exerciseRecords[exerciseName] = {
        maxWeight: 0,
        maxWeightDate: '',
        maxReps: 0,
        maxRepsDate: '',
        recentMaxWeight: 0,
        recentMaxWeightDate: '',
        recentMaxReps: 0,
        recentMaxRepsDate: '',
      };
    }

    for (const set of activity.sets) {
      if (!set.completed) continue;

      if (set.weight && set.weight > exerciseRecords[exerciseName].maxWeight) {
        exerciseRecords[exerciseName].maxWeight = set.weight;
        exerciseRecords[exerciseName].maxWeightDate = activity.date;
      }

      if (set.reps && set.reps > exerciseRecords[exerciseName].maxReps) {
        exerciseRecords[exerciseName].maxReps = set.reps;
        exerciseRecords[exerciseName].maxRepsDate = activity.date;
      }

      if (isRecent) {
        if (
          set.weight &&
          set.weight > exerciseRecords[exerciseName].recentMaxWeight
        ) {
          exerciseRecords[exerciseName].recentMaxWeight = set.weight;
          exerciseRecords[exerciseName].recentMaxWeightDate = activity.date;
        }

        if (
          set.reps &&
          set.reps > exerciseRecords[exerciseName].recentMaxReps
        ) {
          exerciseRecords[exerciseName].recentMaxReps = set.reps;
          exerciseRecords[exerciseName].recentMaxRepsDate = activity.date;
        }
      }
    }
  }

  const records: PersonalRecord[] = [];
  const recentPRs: PersonalRecord[] = [];

  for (const [exerciseName, data] of Object.entries(exerciseRecords)) {
    if (data.maxWeight === 0 && data.maxReps === 0) continue;

    const isNewWeightPR =
      data.recentMaxWeight > 0 &&
      data.recentMaxWeight === data.maxWeight &&
      dayjs(data.maxWeightDate).isAfter(recentCutoff);

    const isNewRepsPR =
      data.recentMaxReps > 0 &&
      data.recentMaxReps === data.maxReps &&
      dayjs(data.maxRepsDate).isAfter(recentCutoff);

    const record: PersonalRecord = {
      exerciseName,
      maxWeight: data.maxWeight,
      maxWeightDate: data.maxWeightDate,
      maxReps: data.maxReps,
      maxRepsDate: data.maxRepsDate,
      isNewWeightPR,
      isNewRepsPR,
    };

    records.push(record);

    if (isNewWeightPR || isNewRepsPR) {
      recentPRs.push(record);
    }
  }

  records.sort((a, b) => b.maxWeight - a.maxWeight);
  recentPRs.sort((a, b) => {
    const aDate = dayjs(a.isNewWeightPR ? a.maxWeightDate : a.maxRepsDate);
    const bDate = dayjs(b.isNewWeightPR ? b.maxWeightDate : b.maxRepsDate);
    return bDate.unix() - aDate.unix();
  });

  return { records, recentPRs };
}

/**
 * Calculate consistency stats
 */
export function calculateConsistencyStats(
  activities: Activity[],
  daysRange: number
): ConsistencyStats {
  const now = dayjs();
  const startDate = now.subtract(daysRange, 'day');

  const completedDates = new Set<string>();
  for (const activity of activities) {
    if (isActivityComplete(activity)) {
      const activityDate = dayjs(activity.date);
      if (
        activityDate.isAfter(startDate) &&
        activityDate.isBefore(now.add(1, 'day'))
      ) {
        completedDates.add(activity.date);
      }
    }
  }

  const uniqueDates = Array.from(completedDates).sort();
  const weeks = daysRange / 7;
  const daysPerWeek = weeks > 0 ? uniqueDates.length / weeks : 0;

  let longestGapDays = 0;
  let longestGapStart = '';
  let longestGapEnd = '';

  if (uniqueDates.length > 1) {
    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = dayjs(uniqueDates[i - 1]);
      const curr = dayjs(uniqueDates[i]);
      const gap = curr.diff(prev, 'day');

      if (gap > longestGapDays) {
        longestGapDays = gap;
        longestGapStart = uniqueDates[i - 1];
        longestGapEnd = uniqueDates[i];
      }
    }
  }

  const weeklyStats: Record<string, { sessions: number; volume: number }> = {};

  for (const activity of activities) {
    if (!isActivityComplete(activity)) continue;

    const activityDate = dayjs(activity.date);
    if (
      !activityDate.isAfter(startDate) ||
      !activityDate.isBefore(now.add(1, 'day'))
    ) {
      continue;
    }

    const weekStart = activityDate.startOf('week').format('YYYY-MM-DD');

    if (!weeklyStats[weekStart]) {
      weeklyStats[weekStart] = { sessions: 0, volume: 0 };
    }

    weeklyStats[weekStart].sessions++;

    if (activity.sets) {
      for (const set of activity.sets) {
        if (set.completed && set.weight && set.reps) {
          weeklyStats[weekStart].volume += set.weight * set.reps;
        }
      }
    }
  }

  let bestWeek = {
    weekStart: '',
    sessions: 0,
    totalVolume: 0,
  };

  for (const [weekStart, stats] of Object.entries(weeklyStats)) {
    if (stats.sessions > bestWeek.sessions) {
      bestWeek = {
        weekStart,
        sessions: stats.sessions,
        totalVolume: stats.volume,
      };
    }
  }

  return {
    daysPerWeek: Math.round(daysPerWeek * 10) / 10,
    longestGapDays,
    longestGapStart,
    longestGapEnd,
    bestWeek,
  };
}

/**
 * Calculate activity type breakdown
 */
export function calculateActivityTypeBreakdown(
  activities: Activity[]
): ActivityTypeStats[] {
  const typeCounts: Record<ActivityType, number> = {
    'weight-training': 0,
    calisthenics: 0,
    cardio: 0,
    mobility: 0,
    recovery: 0,
    sports: 0,
    other: 0,
  };

  for (const activity of activities) {
    if (isActivityComplete(activity) && activity.type) {
      typeCounts[activity.type]++;
    }
  }

  const total = Object.values(typeCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const stats: ActivityTypeStats[] = [];

  for (const [type, count] of Object.entries(typeCounts)) {
    if (count > 0) {
      stats.push({
        type: type as ActivityType,
        label: ACTIVITY_TYPE_LABELS[type as ActivityType],
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        color: ACTIVITY_TYPE_COLORS[type as ActivityType],
      });
    }
  }

  return stats.sort((a, b) => b.count - a.count);
}
