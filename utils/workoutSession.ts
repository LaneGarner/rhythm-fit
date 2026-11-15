import { Activity, DEFAULT_TRACKING_FIELDS } from '../types/activity';
import {
  groupActivitiesWithSupersets,
  getSupersetNames,
  isActivityComplete,
} from './supersetUtils';

export interface SessionItem {
  id: string;
  activityIds: string[];
  label: string;
  route: 'ActivityExecution' | 'SupersetExecution';
  params: { activityId?: string; supersetId?: string };
}
export interface WorkoutSession {
  version: 1;
  date: string;
  items: SessionItem[];
  index: number;
  restDuration: number;
  rest?: { remaining: number; endsAt?: number };
}

export function buildSessionItems(
  activities: Activity[],
  date: string,
  includeCompleted = false
): SessionItem[] {
  const day = activities
    .filter(activity => activity.date === date)
    .sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) -
        (b.order ?? Number.MAX_SAFE_INTEGER)
    );
  return groupActivitiesWithSupersets(day)
    .filter(group => includeCompleted || !group.activities.every(isActivityComplete))
    .map(group => ({
      id: group.supersetId || group.activities[0].id,
      activityIds: group.activities.map(activity => activity.id),
      label: getSupersetNames(group.activities),
      route:
        group.type === 'superset' ? 'SupersetExecution' : 'ActivityExecution',
      params:
        group.type === 'superset'
          ? { supersetId: group.supersetId }
          : { activityId: group.activities[0].id },
    }));
}

export function nextSessionIndex(
  session: WorkoutSession,
  activities: Activity[],
  start = session.index + 1
): number {
  for (let index = start; index < session.items.length; index++) {
    const records = activities.filter(activity =>
      session.items[index].activityIds.includes(activity.id)
    );
    if (records.some(activity => !isActivityComplete(activity))) return index;
  }
  return -1;
}

export function getUpcomingActivities(
  items: SessionItem[],
  currentIndex: number,
  activities: Activity[]
): Activity[] {
  const byId = new Map(activities.map(activity => [activity.id, activity]));

  if (currentIndex < 0) return [];
  for (const item of items.slice(currentIndex + 1)) {
    const upcoming = item.activityIds.flatMap(id => {
      const activity = byId.get(id);
      return activity &&
        !isActivityComplete(activity)
        ? [activity]
        : [];
    });
    if (upcoming.length) return upcoming;
  }
  return [];
}

export function summarizeUpcomingSets(activity: Activity): string {
  const fields = activity.trackingFields || DEFAULT_TRACKING_FIELDS[activity.type];
  const groups: { targets: string; count: number }[] = [];

  for (const set of activity.sets || []) {
    if (set.completed) continue;
    const values = {
      reps: set.reps ? `${set.reps} reps` : '',
      weight: set.weight ? `${set.weight} lbs` : '',
      time: set.time ? `${Math.floor(set.time / 60)}:${String(set.time % 60).padStart(2, '0')}` : '',
      distance: set.distance ? `${set.distance} mi` : '',
      band: set.band ? `${set.band} band` : '',
    };
    const targets = fields.map(field => values[field]).filter(Boolean).join(' · ');
    const previous = groups[groups.length - 1];
    if (previous?.targets === targets) previous.count++;
    else groups.push({ targets, count: 1 });
  }

  return groups.map(({ count, targets }) =>
    [`${count} ${count === 1 ? 'set' : 'sets'}`, targets].filter(Boolean).join(' · ')
  ).join(' / ');
}

export function parseWorkoutSession(
  value: string | null
): WorkoutSession | null {
  try {
    const session = JSON.parse(value || 'null');
    if (
      session?.version !== 1 ||
      typeof session.date !== 'string' ||
      !Array.isArray(session.items) ||
      !Number.isInteger(session.index) ||
      session.index < 0 ||
      session.index >= session.items.length ||
      !Number.isFinite(session.restDuration) ||
      session.restDuration <= 0 ||
      session.items.some(
        (item: SessionItem) =>
          !item ||
          typeof item.id !== 'string' ||
          typeof item.label !== 'string' ||
          !Array.isArray(item.activityIds) ||
          !item.activityIds.length ||
          item.activityIds.some(id => typeof id !== 'string') ||
          !item.params ||
          (item.route !== 'ActivityExecution' &&
            item.route !== 'SupersetExecution') ||
          (item.route === 'ActivityExecution'
            ? typeof item.params.activityId !== 'string'
            : typeof item.params.supersetId !== 'string')
      ) ||
      (session.rest &&
        (!Number.isFinite(session.rest.remaining) ||
          session.rest.remaining < 0 ||
          (session.rest.endsAt !== undefined &&
            !Number.isFinite(session.rest.endsAt))))
    )
      return null;
    return session;
  } catch {
    return null;
  }
}
