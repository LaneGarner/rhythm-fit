import { Activity, SetData } from '../types/activity';

/**
 * Represents a group of activities for rendering - either a single activity or a superset
 */
export interface ActivityGroup {
  type: 'single' | 'superset';
  activities: Activity[];
  supersetId?: string;
}

/**
 * Represents a superset round (one set from each activity)
 */
export interface SupersetRound {
  roundNumber: number;
  sets: { activity: Activity; set: SetData | null; setIndex: number }[];
}

/**
 * Get the display label for a superset based on activity count
 */
export function getSupersetLabel(count: number): string {
  if (count === 2) return 'Superset';
  if (count === 3) return 'Triset';
  return `${count}x Giant Set`;
}

/**
 * Get display title for a superset: "Bench Press -> Band Rows -> Face Pulls"
 */
export function getSupersetTitle(activities: Activity[]): string {
  return activities.map(a => a.name || a.type).join(' → ');
}

/**
 * Get combined emoji + name pairs for superset display: "🏋️ Bench Press → 🚣 Band Rows"
 */
export function getSupersetEmojis(activities: Activity[]): string {
  return activities
    .map(a => `${a.emoji || '💪'} ${a.name || a.type}`)
    .join(' → ');
}

/**
 * Get just emojis with arrows for compact display: "🏋️ → 🚣"
 */
export function getSupersetEmojisCompact(activities: Activity[]): string {
  return activities.map(a => a.emoji || '💪').join(' → ');
}

/**
 * Check if all activities in a superset are complete
 */
export function isSupersetComplete(activities: Activity[]): boolean {
  return activities.length > 0 && activities.every(a => a.completed);
}

/**
 * Get activities in a superset by ID, sorted by position
 */
export function getSupersetActivities(
  allActivities: Activity[],
  supersetId: string
): Activity[] {
  return allActivities
    .filter(a => a.supersetId === supersetId)
    .sort((a, b) => (a.supersetPosition || 0) - (b.supersetPosition || 0));
}

/**
 * Get the maximum set count across all activities in a superset
 */
export function getMaxSetCount(activities: Activity[]): number {
  return Math.max(...activities.map(a => a.sets?.length || 0), 0);
}

/**
 * Build superset rounds for alternating display in execution screen
 */
export function buildSupersetRounds(activities: Activity[]): SupersetRound[] {
  const maxSets = getMaxSetCount(activities);
  const rounds: SupersetRound[] = [];

  for (let i = 0; i < maxSets; i++) {
    rounds.push({
      roundNumber: i + 1,
      sets: activities.map(activity => ({
        activity,
        set: activity.sets?.[i] || null,
        setIndex: i,
      })),
    });
  }

  return rounds;
}

/**
 * Group activities into singles and supersets for rendering
 * Maintains the order based on the first activity in each superset
 */
export function groupActivitiesWithSupersets(
  activities: Activity[]
): ActivityGroup[] {
  const groups: ActivityGroup[] = [];
  const processedSupersetIds = new Set<string>();

  // Sort activities by order, then by id
  const sortedActivities = [...activities].sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.id.localeCompare(b.id);
  });

  for (const activity of sortedActivities) {
    if (activity.supersetId) {
      // Skip if we've already processed this superset
      if (processedSupersetIds.has(activity.supersetId)) {
        continue;
      }

      // Get all activities in this superset
      const supersetActivities = getSupersetActivities(
        activities,
        activity.supersetId
      );

      groups.push({
        type: 'superset',
        activities: supersetActivities,
        supersetId: activity.supersetId,
      });

      processedSupersetIds.add(activity.supersetId);
    } else {
      // Single activity
      groups.push({
        type: 'single',
        activities: [activity],
      });
    }
  }

  return groups;
}

/**
 * Count completed activities in a superset
 */
export function getSupersetCompletedCount(activities: Activity[]): number {
  return activities.filter(a => a.completed).length;
}

/**
 * Generate a unique superset ID
 */
export function generateSupersetId(): string {
  return `superset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if an activity can be added to a superset (must be on the same date)
 */
export function canAddToSuperset(
  existingActivities: Activity[],
  newActivity: Activity
): boolean {
  if (existingActivities.length === 0) return true;
  return existingActivities[0].date === newActivity.date;
}

/**
 * Get the next position for a new activity being added to a superset
 */
export function getNextSupersetPosition(activities: Activity[]): number {
  const maxPosition = Math.max(
    ...activities.map(a => a.supersetPosition || 0),
    0
  );
  return maxPosition + 1;
}
