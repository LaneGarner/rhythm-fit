import dayjs from 'dayjs';
import { Activity } from '../types/activity';
import {
  calculateMuscleGroupStats,
  calculateOverallStats,
  calculatePersonalRecords,
  calculateConsistencyStats,
  calculateActivityTypeBreakdown,
  calculateExerciseStats,
  getUniqueExercises,
  MuscleGroupStats,
  BodyPart,
  BODY_PART_LABELS,
  ACTIVITY_TYPE_LABELS,
} from './statsService';

export interface CoachAnalytics {
  muscleImbalances: { undertrained: string[]; overtrained: string[] };
  stalledExercises: { name: string; daysSinceProgress: number; currentMax: number }[];
  consistency: {
    currentStreak: number;
    daysPerWeek: number;
    trend: 'improving' | 'declining' | 'stable';
  };
  recentPRs: { exercise: string; type: 'weight' | 'reps'; value: number }[];
  activityBalance: { type: string; percentage: number }[];
  mostActiveDay: string;
  leastActiveDay: string;
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Find muscles that are undertrained (<30% of average) or overtrained (>250% of average)
 */
function calculateMuscleImbalances(
  muscleStats: MuscleGroupStats[]
): { undertrained: string[]; overtrained: string[] } {
  if (muscleStats.length === 0) {
    return { undertrained: [], overtrained: [] };
  }

  // Filter out 'none', 'cardio', and 'full-body' from muscle analysis
  const relevantMuscles = muscleStats.filter(
    m => m.muscle !== 'none' && m.muscle !== 'cardio' && m.muscle !== 'full-body'
  );

  if (relevantMuscles.length === 0) {
    return { undertrained: [], overtrained: [] };
  }

  const totalSets = relevantMuscles.reduce((sum, m) => sum + m.totalSets, 0);
  const averageSets = totalSets / relevantMuscles.length;

  const undertrained: string[] = [];
  const overtrained: string[] = [];

  for (const muscle of relevantMuscles) {
    const ratio = muscle.totalSets / averageSets;

    if (ratio < 0.3) {
      undertrained.push(muscle.label);
    } else if (ratio > 2.5) {
      overtrained.push(muscle.label);
    }
  }

  return { undertrained, overtrained };
}

/**
 * Find exercises that haven't had weight progression in 3+ weeks
 */
function findStalledExercises(
  activities: Activity[]
): { name: string; daysSinceProgress: number; currentMax: number }[] {
  const stalledExercises: {
    name: string;
    daysSinceProgress: number;
    currentMax: number;
  }[] = [];
  const uniqueExercises = getUniqueExercises(activities);
  const now = dayjs();
  const threeWeeksAgo = now.subtract(21, 'day');

  for (const exerciseName of uniqueExercises) {
    const stats = calculateExerciseStats(activities, exerciseName);
    if (!stats || stats.history.length < 2 || stats.maxWeight === 0) continue;

    // Find when the max weight was achieved
    const maxWeightEntry = stats.history.find(h => h.maxWeight === stats.maxWeight);
    if (!maxWeightEntry) continue;

    const maxWeightDate = dayjs(maxWeightEntry.date);

    // Check if max weight was achieved more than 3 weeks ago
    if (maxWeightDate.isBefore(threeWeeksAgo)) {
      // Verify they've trained this exercise recently (within last 2 weeks)
      const recentSessions = stats.history.filter(h =>
        dayjs(h.date).isAfter(now.subtract(14, 'day'))
      );

      if (recentSessions.length > 0) {
        const daysSinceProgress = now.diff(maxWeightDate, 'day');
        stalledExercises.push({
          name: exerciseName,
          daysSinceProgress,
          currentMax: stats.maxWeight,
        });
      }
    }
  }

  // Sort by days stalled (longest first) and limit to top 3
  return stalledExercises
    .sort((a, b) => b.daysSinceProgress - a.daysSinceProgress)
    .slice(0, 3);
}

/**
 * Calculate consistency trend by comparing recent 2 weeks to prior 2 weeks
 */
function calculateConsistencyTrend(
  activities: Activity[]
): 'improving' | 'declining' | 'stable' {
  const now = dayjs();

  // Recent 2 weeks
  const recentStart = now.subtract(14, 'day');
  const recentActivities = activities.filter(a => {
    const date = dayjs(a.date);
    return a.completed && date.isAfter(recentStart) && date.isBefore(now.add(1, 'day'));
  });

  // Prior 2 weeks (days 15-28 ago)
  const priorStart = now.subtract(28, 'day');
  const priorEnd = now.subtract(14, 'day');
  const priorActivities = activities.filter(a => {
    const date = dayjs(a.date);
    return a.completed && date.isAfter(priorStart) && date.isSameOrBefore(priorEnd);
  });

  const recentCount = new Set(recentActivities.map(a => a.date)).size;
  const priorCount = new Set(priorActivities.map(a => a.date)).size;

  if (priorCount === 0) {
    return recentCount > 0 ? 'improving' : 'stable';
  }

  const changeRatio = recentCount / priorCount;

  if (changeRatio > 1.2) {
    return 'improving';
  } else if (changeRatio < 0.8) {
    return 'declining';
  }
  return 'stable';
}

/**
 * Find the most and least active days of the week
 */
function calculateDayDistribution(
  activities: Activity[]
): { mostActive: string; leastActive: string } {
  const dayCounts: Record<number, number> = {};
  for (let i = 0; i < 7; i++) {
    dayCounts[i] = 0;
  }

  const now = dayjs();
  const thirtyDaysAgo = now.subtract(30, 'day');

  for (const activity of activities) {
    if (!activity.completed) continue;
    const date = dayjs(activity.date);
    if (date.isAfter(thirtyDaysAgo) && date.isBefore(now.add(1, 'day'))) {
      const dayOfWeek = date.day();
      dayCounts[dayOfWeek]++;
    }
  }

  let maxDay = 0;
  let minDay = 0;
  let maxCount = dayCounts[0];
  let minCount = dayCounts[0];

  for (let i = 1; i < 7; i++) {
    if (dayCounts[i] > maxCount) {
      maxCount = dayCounts[i];
      maxDay = i;
    }
    if (dayCounts[i] < minCount) {
      minCount = dayCounts[i];
      minDay = i;
    }
  }

  return {
    mostActive: DAYS_OF_WEEK[maxDay],
    leastActive: DAYS_OF_WEEK[minDay],
  };
}

/**
 * Build complete coach analytics from activity data
 */
export function buildCoachAnalytics(activities: Activity[]): CoachAnalytics {
  const muscleStats = calculateMuscleGroupStats(activities);
  const muscleImbalances = calculateMuscleImbalances(muscleStats);
  const stalledExercises = findStalledExercises(activities);

  const overallStats = calculateOverallStats(activities, 30);
  const consistencyStats = calculateConsistencyStats(activities, 30);
  const consistencyTrend = calculateConsistencyTrend(activities);

  const prResult = calculatePersonalRecords(activities, 14);
  const recentPRs: CoachAnalytics['recentPRs'] = prResult.recentPRs
    .slice(0, 3)
    .map(pr => ({
      exercise: pr.exerciseName,
      type: pr.isNewWeightPR ? ('weight' as const) : ('reps' as const),
      value: pr.isNewWeightPR ? pr.maxWeight : pr.maxReps,
    }));

  const activityTypes = calculateActivityTypeBreakdown(activities);
  const activityBalance = activityTypes.slice(0, 4).map(t => ({
    type: t.label,
    percentage: t.percentage,
  }));

  const dayDistribution = calculateDayDistribution(activities);

  return {
    muscleImbalances,
    stalledExercises,
    consistency: {
      currentStreak: overallStats.currentStreak,
      daysPerWeek: consistencyStats.daysPerWeek,
      trend: consistencyTrend,
    },
    recentPRs,
    activityBalance,
    mostActiveDay: dayDistribution.mostActive,
    leastActiveDay: dayDistribution.leastActive,
  };
}

/**
 * Format analytics into a concise string for the coach prompt (~500 chars max)
 */
export function formatAnalyticsForPrompt(analytics: CoachAnalytics): string {
  const lines: string[] = [];

  // Current streak
  if (analytics.consistency.currentStreak > 0) {
    lines.push(`Current streak: ${analytics.consistency.currentStreak} days`);
  }

  // Training frequency with trend
  const trendEmoji =
    analytics.consistency.trend === 'improving'
      ? ' (improving)'
      : analytics.consistency.trend === 'declining'
        ? ' (declining)'
        : '';
  lines.push(
    `Training frequency: ${analytics.consistency.daysPerWeek} days/week${trendEmoji}`
  );

  // Recent PRs
  if (analytics.recentPRs.length > 0) {
    const prStrings = analytics.recentPRs.map(pr =>
      pr.type === 'weight' ? `${pr.exercise} (${pr.value}lbs)` : `${pr.exercise} (${pr.value} reps)`
    );
    lines.push(`Recent PRs: ${prStrings.join(', ')}`);
  }

  // Undertrained muscles
  if (analytics.muscleImbalances.undertrained.length > 0) {
    lines.push(`Undertrained: ${analytics.muscleImbalances.undertrained.join(', ')}`);
  }

  // Stalled exercises
  if (analytics.stalledExercises.length > 0) {
    const stalledStrings = analytics.stalledExercises.map(
      e => `${e.name} (${e.daysSinceProgress}d stalled)`
    );
    lines.push(`Needs progression: ${stalledStrings.join(', ')}`);
  }

  // Activity balance
  if (analytics.activityBalance.length > 0) {
    const balanceStrings = analytics.activityBalance.map(
      b => `${b.type}: ${b.percentage}%`
    );
    lines.push(`Activity mix: ${balanceStrings.join(', ')}`);
  }

  // Most/least active days
  lines.push(
    `Most active: ${analytics.mostActiveDay}, Least active: ${analytics.leastActiveDay}`
  );

  return lines.join('\n');
}
