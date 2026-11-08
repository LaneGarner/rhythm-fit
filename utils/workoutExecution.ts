import { Activity, SetData } from '../types/activity';
import { buildSupersetRounds } from './supersetUtils';

export interface ExecutionSetChange {
  activityId: string;
  setId: string;
  updates: Partial<SetData>;
}

export function buildExecutionUnits(activities: Activity[], grouped: boolean) {
  const units = grouped
    ? buildSupersetRounds(activities).map(round => ({
        id: `round-${round.roundNumber}`,
        number: round.roundNumber,
        entries: round.sets.flatMap(({ activity, set, setIndex }) =>
          set ? [{ activity, set, setIndex }] : []
        ),
      }))
    : (activities[0]?.sets || []).map((set, setIndex) => ({
        id: set.id,
        number: setIndex + 1,
        entries: [{ activity: activities[0], set, setIndex }],
      }));
  return units
    .map(unit => ({
      ...unit,
      completed:
        unit.entries.length > 0 &&
        unit.entries.every(entry => entry.set.completed),
    }))
    .sort((a, b) => Number(a.completed) - Number(b.completed));
}

// Work from current records, never a screen-local copy. Editing one set or a
// whole round follows the same completion rules and preserves all other data.
export function applyExecutionChanges(
  activities: Activity[],
  changes: ExecutionSetChange[]
): Activity[] {
  return activities.flatMap(activity => {
    const ownChanges = changes.filter(
      change =>
        change.activityId === activity.id &&
        activity.sets?.some(set => set.id === change.setId)
    );
    if (!ownChanges.length) return [];
    const sets = (activity.sets || []).map(set => {
      const change = ownChanges.find(candidate => candidate.setId === set.id);
      return change ? { ...set, ...change.updates } : set;
    });
    return [
      {
        ...activity,
        sets,
        completed: ownChanges.some(
          change => change.updates.completed !== undefined
        )
          ? sets.length > 0 && sets.every(set => set.completed)
          : activity.completed,
      },
    ];
  });
}

export function getExecutionOutcome(
  activities: Activity[],
  changes: ExecutionSetChange[]
) {
  const updated = applyExecutionChanges(activities, changes);
  const next = activities.map(
    activity => updated.find(item => item.id === activity.id) || activity
  );
  const markedComplete =
    changes.some(change => change.updates.completed === true) &&
    updated.length > 0;
  const allComplete =
    next.length > 0 && next.every(activity => activity.completed);
  return {
    updated,
    finished:
      markedComplete &&
      allComplete &&
      !activities.every(activity => activity.completed),
    startRest: markedComplete && !allComplete,
  };
}
