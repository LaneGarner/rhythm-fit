import dayjs from 'dayjs';
import { addActivity, createSuperset } from '../redux/activitySlice';
import { AppDispatch } from '../redux/store';
import { Activity, ActivityType, SetData } from '../types/activity';
import { toTitleCase } from '../utils/storage';
import { ParsedActivity, ParsedExercise, ParsedSetData } from './chatApi';

// Shared activity-creation logic used by both the Coach chat and the onboarding
// plan generator. Lifted verbatim from CoachScreen so there is one code path.

// Marker stamped into the `notes` of every coach-scheduled activity. Used to
// identify a previously generated plan so a regenerate can clear it.
export const COACH_NOTE_MARKER = 'Created by AI coach';

// True if an activity was scheduled by the AI coach (plan generator or chat).
export function isCoachActivity(activity: { notes?: string }): boolean {
  return Boolean(activity.notes?.includes(COACH_NOTE_MARKER));
}

export function generateDefaultSets(type: ActivityType): SetData[] {
  const count = type === 'weight-training' || type === 'calisthenics' ? 3 : 1;
  return Array.from({ length: count }, (_, i) => ({
    id: `${Date.now().toString()}-${Math.random().toString(36).substr(2, 6)}-${i}`,
    completed: false,
  }));
}

export function generateSetsFromParsed(
  parsedSets: ParsedSetData[] | undefined,
  type: ActivityType
): SetData[] {
  if (parsedSets && parsedSets.length > 0) {
    return parsedSets.map((s, i) => ({
      id: `${Date.now().toString()}-${Math.random().toString(36).substr(2, 6)}-${i}`,
      reps: s.reps,
      weight: s.weight,
      time: s.time,
      distance: s.distance,
      completed: false,
    }));
  }
  return generateDefaultSets(type);
}

function isGenericExercise(exercise: string): boolean {
  const lowerExercise = exercise.toLowerCase().trim();
  const genericTerms = [
    'workout',
    'workouts',
    'exercise',
    'exercises',
    'activity',
    'activities',
    'routine',
    'routines',
    'training',
    'session',
    'sessions',
    'the following',
    'following',
    'pull workout',
    'push workout',
    'leg workout',
    'chest workout',
    'back workout',
    'full body workout',
    'arm workout',
    'shoulder workout',
    'it to my schedule',
    'my schedule',
    'to my schedule',
  ];
  return genericTerms.some(term => lowerExercise.includes(term));
}

/**
 * Turn parsed AI activities into scheduled Redux activities. Handles recurrence
 * (one week replicated +7 days × weeksToRepeat) and superset grouping. Returns
 * the activities created (already dispatched). Sync happens via middleware.
 */
export function createActivitiesFromRequest(
  activityRequests: ParsedActivity[],
  dispatch: AppDispatch
): Activity[] {
  const createdActivities: Activity[] = [];

  for (const request of activityRequests) {
    try {
      if (!request.date || !request.exercises || !request.exercises.length) {
        continue;
      }

      const hasGenericExercises = request.exercises.some(isGenericExercise);
      if (hasGenericExercises) continue;

      const exercises: string[] =
        request.exercises.length > 1
          ? request.exercises
          : [request.exercises[0]];

      const createActivitiesForWeek = (
        weekOffset: number,
        weekLabel?: string
      ): Activity[] => {
        const weekActivities: Activity[] = [];
        const activityDate = dayjs(request.date)
          .add(weekOffset * 7, 'day')
          .format('YYYY-MM-DD');

        for (const exercise of exercises) {
          if (!exercise || typeof exercise !== 'string') continue;

          const detail = request.exerciseDetails?.find(
            (d: ParsedExercise) =>
              d.name.toLowerCase() === exercise.toLowerCase()
          );

          const activity: Activity = {
            id:
              Date.now().toString() +
              Math.random().toString(36).substr(2, 9) +
              weekOffset +
              weekActivities.length,
            date: activityDate,
            type: request.type,
            name: toTitleCase(exercise),
            completed: false,
            sets: generateSetsFromParsed(detail?.sets, request.type),
            notes: weekLabel
              ? `${weekLabel} - ${COACH_NOTE_MARKER}`
              : `${COACH_NOTE_MARKER} based on your request`,
          };
          dispatch(addActivity(activity));
          weekActivities.push(activity);
        }

        if (request.supersetGroups?.length) {
          for (const group of request.supersetGroups) {
            if (group.length >= 2) {
              const ids = group
                .filter((i: number) => i < weekActivities.length)
                .map((i: number) => weekActivities[i].id);
              if (ids.length >= 2) {
                dispatch(createSuperset({ activityIds: ids }));
              }
            }
          }
        }

        return weekActivities;
      };

      if (request.isRecurring) {
        for (let week = 0; week < request.weeksToRepeat; week++) {
          const weekActivities = createActivitiesForWeek(
            week,
            `Recurring activity (week ${week + 1}/${request.weeksToRepeat})`
          );
          createdActivities.push(...weekActivities);
        }
      } else {
        const weekActivities = createActivitiesForWeek(0);
        createdActivities.push(...weekActivities);
      }
    } catch (error) {
      console.error('Error creating activity from request:', request, error);
    }
  }

  return createdActivities;
}
