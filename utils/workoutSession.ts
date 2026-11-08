import { Activity } from '../types/activity';
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
  date: string
): SessionItem[] {
  const day = activities
    .filter(activity => activity.date === date)
    .sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) -
        (b.order ?? Number.MAX_SAFE_INTEGER)
    );
  return groupActivitiesWithSupersets(day)
    .filter(group => !group.activities.every(isActivityComplete))
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
