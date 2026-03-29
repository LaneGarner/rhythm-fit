import dayjs from 'dayjs';
import { Activity } from '../types/activity';
import { isActivityComplete } from '../utils/supersetUtils';
import { SetData } from '../types/activity';
import {
  calculateMuscleGroupStats,
  calculateOverallStats,
  calculatePersonalRecords,
  calculateConsistencyStats,
  calculateActivityTypeBreakdown,
  calculateExerciseStats,
  getUniqueExercises,
  formatTime,
  formatDistance,
  MuscleGroupStats,
  BodyPart,
  BODY_PART_LABELS,
  ACTIVITY_TYPE_LABELS,
} from './statsService';

export interface CoachAnalytics {
  muscleImbalances: { undertrained: string[]; overtrained: string[] };
  stalledExercises: {
    name: string;
    daysSinceProgress: number;
    currentMax: number;
  }[];
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
function calculateMuscleImbalances(muscleStats: MuscleGroupStats[]): {
  undertrained: string[];
  overtrained: string[];
} {
  if (muscleStats.length === 0) {
    return { undertrained: [], overtrained: [] };
  }

  // Filter out 'none', 'cardio', and 'full-body' from muscle analysis
  const relevantMuscles = muscleStats.filter(
    m =>
      m.muscle !== 'none' && m.muscle !== 'cardio' && m.muscle !== 'full-body'
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
    const maxWeightEntry = stats.history.find(
      h => h.maxWeight === stats.maxWeight
    );
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
    return (
      a.completed &&
      date.isAfter(recentStart) &&
      date.isBefore(now.add(1, 'day'))
    );
  });

  // Prior 2 weeks (days 15-28 ago)
  const priorStart = now.subtract(28, 'day');
  const priorEnd = now.subtract(14, 'day');
  const priorActivities = activities.filter(a => {
    const date = dayjs(a.date);
    return (
      a.completed && date.isAfter(priorStart) && date.isSameOrBefore(priorEnd)
    );
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
function calculateDayDistribution(activities: Activity[]): {
  mostActive: string;
  leastActive: string;
} {
  const dayCounts: Record<number, number> = {};
  for (let i = 0; i < 7; i++) {
    dayCounts[i] = 0;
  }

  const now = dayjs();
  const thirtyDaysAgo = now.subtract(30, 'day');

  for (const activity of activities) {
    if (!isActivityComplete(activity)) continue;
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
      pr.type === 'weight'
        ? `${pr.exercise} (${pr.value}lbs)`
        : `${pr.exercise} (${pr.value} reps)`
    );
    lines.push(`Recent PRs: ${prStrings.join(', ')}`);
  }

  // Undertrained muscles
  if (analytics.muscleImbalances.undertrained.length > 0) {
    lines.push(
      `Undertrained: ${analytics.muscleImbalances.undertrained.join(', ')}`
    );
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

/**
 * Compress completed sets into a readable shorthand like "3x8 @185lbs, 1x6 @195lbs"
 */
function compressSets(sets: SetData[]): string {
  const completed = sets.filter(s => s.completed);
  if (completed.length === 0) return '';

  // Check if these are weight-based, time-based, or reps-only sets
  const hasWeight = completed.some(s => s.weight && s.weight > 0);
  const hasTime = completed.some(s => s.time && s.time > 0);
  const hasDistance = completed.some(s => s.distance && s.distance > 0);
  const hasReps = completed.some(s => s.reps && s.reps > 0);

  // Time/distance-based (cardio): sum totals
  if (hasTime && !hasWeight) {
    const totalTime = completed.reduce((sum, s) => sum + (s.time || 0), 0);
    const totalDist = completed.reduce((sum, s) => sum + (s.distance || 0), 0);
    const parts: string[] = [];
    if (totalTime > 0) parts.push(formatTime(totalTime));
    if (totalDist > 0) parts.push(formatDistance(totalDist));
    return parts.join(', ');
  }

  // Weight-based or reps-only: run-length encode by (weight, reps) tuple
  const groups: { weight: number; reps: number; count: number }[] = [];
  for (const set of completed) {
    const w = set.weight || 0;
    const r = set.reps || 0;
    const last = groups[groups.length - 1];
    if (last && last.weight === w && last.reps === r) {
      last.count++;
    } else {
      groups.push({ weight: w, reps: r, count: 1 });
    }
  }

  return groups
    .map(g => {
      if (hasWeight && g.weight > 0) {
        return `${g.count}x${g.reps} @${g.weight}lbs`;
      }
      return `${g.count}x${g.reps}`;
    })
    .join(', ');
}

/**
 * Build detailed workout log for the last N days
 */
export function buildRecentWorkoutDetails(
  activities: Activity[],
  days: number = 7
): string {
  const now = dayjs();
  const cutoff = now.subtract(days, 'day');

  const recent = activities
    .filter(a => {
      const date = dayjs(a.date);
      return (
        isActivityComplete(a) &&
        date.isAfter(cutoff, 'day') &&
        date.isSameOrBefore(now, 'day')
      );
    })
    .sort((a, b) => dayjs(b.date).unix() - dayjs(a.date).unix());

  if (recent.length === 0) return '';

  // Group by date
  const grouped: Record<string, Activity[]> = {};
  for (const activity of recent) {
    if (!grouped[activity.date]) grouped[activity.date] = [];
    grouped[activity.date].push(activity);
  }

  const lines: string[] = ['Recent workouts (last 7 days):'];

  for (const date of Object.keys(grouped).sort(
    (a, b) => dayjs(b).unix() - dayjs(a).unix()
  )) {
    const dayActivities = grouped[date];
    const formattedDate = dayjs(date).format('ddd, MMM D');
    const exercises = dayActivities.map(a => {
      const setInfo = a.sets && a.sets.length > 0 ? compressSets(a.sets) : '';
      return setInfo ? `${a.name} (${setInfo})` : a.name;
    });
    lines.push(`- ${formattedDate}: ${exercises.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Build condensed weekly summaries for the past N weeks (excluding last 7 days)
 */
export function buildWeeklySummaries(
  activities: Activity[],
  weeks: number = 12
): string {
  const now = dayjs();
  const recentCutoff = now.subtract(7, 'day');
  const historyCutoff = now.subtract(weeks * 7, 'day');

  const historical = activities.filter(a => {
    const date = dayjs(a.date);
    return (
      isActivityComplete(a) &&
      date.isAfter(historyCutoff, 'day') &&
      date.isSameOrBefore(recentCutoff, 'day')
    );
  });

  if (historical.length === 0) return '';

  // Group by week start (Sunday)
  const weekGroups: Record<
    string,
    { count: number; types: Record<string, number>; volume: number }
  > = {};

  for (const activity of historical) {
    const weekStart = dayjs(activity.date).startOf('week').format('YYYY-MM-DD');
    if (!weekGroups[weekStart]) {
      weekGroups[weekStart] = { count: 0, types: {}, volume: 0 };
    }
    const week = weekGroups[weekStart];
    week.count++;

    const typeLabel = ACTIVITY_TYPE_LABELS[activity.type] || 'Other';
    week.types[typeLabel] = (week.types[typeLabel] || 0) + 1;

    if (activity.sets) {
      for (const set of activity.sets) {
        if (set.completed && set.weight && set.reps) {
          week.volume += set.weight * set.reps;
        }
      }
    }
  }

  const sortedWeeks = Object.keys(weekGroups).sort(
    (a, b) => dayjs(b).unix() - dayjs(a).unix()
  );

  if (sortedWeeks.length === 0) return '';

  const lines: string[] = ['Weekly history:'];

  for (const weekStart of sortedWeeks) {
    const week = weekGroups[weekStart];
    const dateLabel = dayjs(weekStart).format('MMM D');
    const typeSummary = Object.entries(week.types)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => (count > 1 ? `${type} x${count}` : type))
      .join(', ');
    const volumeStr =
      week.volume > 0
        ? `, volume: ${Math.round(week.volume).toLocaleString()} lbs`
        : '';
    lines.push(
      `- Week of ${dateLabel}: ${week.count} workouts (${typeSummary})${volumeStr}`
    );
  }

  return lines.join('\n');
}

/**
 * Build per-exercise progression summaries for top exercises
 */
export function buildExerciseProgression(
  activities: Activity[],
  topN: number = 8
): string {
  const uniqueExercises = getUniqueExercises(activities);

  // Calculate stats for each exercise and sort by session count
  const exerciseData = uniqueExercises
    .map(name => calculateExerciseStats(activities, name))
    .filter(
      (stats): stats is NonNullable<typeof stats> =>
        stats !== null && stats.sessions >= 2
    )
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, topN);

  if (exerciseData.length === 0) return '';

  const lines: string[] = ['Exercise progression (top lifts):'];

  for (const stats of exerciseData) {
    const firstDate = dayjs(stats.history[0].date);
    const lastDate = dayjs(stats.history[stats.history.length - 1].date);
    const monthSpan = Math.max(1, lastDate.diff(firstDate, 'month'));
    const timeStr =
      monthSpan >= 2
        ? `${monthSpan} months`
        : `${lastDate.diff(firstDate, 'week') || 1} weeks`;

    if (stats.maxWeight > 0) {
      // Weight-based: sample progression milestones
      const milestones = sampleWeightProgression(stats.history);
      const chain = milestones.join(' → ');
      lines.push(
        `- ${stats.exerciseName}: ${chain} lbs (${timeStr}, ${stats.sessions} sessions, PR: ${stats.maxWeight} lbs)`
      );
    } else if (stats.totalDistance > 0 || stats.totalTime > 0) {
      // Cardio/time-distance
      const parts: string[] = [];
      if (stats.totalDistance > 0) {
        const avgDist = stats.totalDistance / stats.sessions;
        let bestDist = 0;
        for (const h of stats.history) {
          if (h.totalDistance > bestDist) bestDist = h.totalDistance;
        }
        parts.push(
          `avg ${formatDistance(avgDist)}/session, best ${formatDistance(bestDist)}`
        );
      }
      if (stats.totalTime > 0) {
        const avgTime = Math.round(stats.totalTime / stats.sessions);
        parts.push(`avg ${formatTime(avgTime)}`);
      }
      parts.push(`${stats.sessions} sessions`);
      lines.push(`- ${stats.exerciseName}: ${parts.join(', ')}`);
    } else if (stats.maxReps > 0) {
      // Reps-only
      const milestones = sampleRepsProgression(stats.history);
      const chain = milestones.join(' → ');
      lines.push(
        `- ${stats.exerciseName}: max ${chain} reps (${timeStr}, ${stats.sessions} sessions)`
      );
    }
  }

  return lines.length > 1 ? lines.join('\n') : '';
}

/**
 * Sample weight progression milestones from exercise history.
 * Emits a value when max weight increases by 5+ lbs or 5%+ from last milestone.
 */
function sampleWeightProgression(history: { maxWeight: number }[]): number[] {
  if (history.length === 0) return [];

  const milestones: number[] = [history[0].maxWeight];
  let lastMilestone = history[0].maxWeight;
  let runningMax = lastMilestone;

  for (let i = 1; i < history.length; i++) {
    if (history[i].maxWeight > runningMax) {
      runningMax = history[i].maxWeight;
      const increase = runningMax - lastMilestone;
      const pctIncrease = lastMilestone > 0 ? increase / lastMilestone : 1;
      if (increase >= 5 || pctIncrease >= 0.05) {
        milestones.push(runningMax);
        lastMilestone = runningMax;
      }
    }
  }

  // Always include the final max if different from last milestone
  if (milestones[milestones.length - 1] !== runningMax) {
    milestones.push(runningMax);
  }

  // Cap at 8 milestones for brevity
  if (milestones.length > 8) {
    const step = (milestones.length - 1) / 7;
    const sampled = [milestones[0]];
    for (let i = 1; i < 7; i++) {
      sampled.push(milestones[Math.round(i * step)]);
    }
    sampled.push(milestones[milestones.length - 1]);
    return [...new Set(sampled)];
  }

  return milestones;
}

/**
 * Sample reps progression milestones from exercise history.
 */
function sampleRepsProgression(history: { maxReps: number }[]): number[] {
  if (history.length === 0) return [];

  const milestones: number[] = [history[0].maxReps];
  let lastMilestone = history[0].maxReps;
  let runningMax = lastMilestone;

  for (let i = 1; i < history.length; i++) {
    if (history[i].maxReps > runningMax) {
      runningMax = history[i].maxReps;
      if (runningMax - lastMilestone >= 2) {
        milestones.push(runningMax);
        lastMilestone = runningMax;
      }
    }
  }

  if (milestones[milestones.length - 1] !== runningMax) {
    milestones.push(runningMax);
  }

  if (milestones.length > 8) {
    const step = (milestones.length - 1) / 7;
    const sampled = [milestones[0]];
    for (let i = 1; i < 7; i++) {
      sampled.push(milestones[Math.round(i * step)]);
    }
    sampled.push(milestones[milestones.length - 1]);
    return [...new Set(sampled)];
  }

  return milestones;
}
