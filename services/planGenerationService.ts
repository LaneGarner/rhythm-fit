import dayjs from 'dayjs';
import { deleteActivity } from '../redux/activitySlice';
import { AppDispatch } from '../redux/store';
import { Activity } from '../types/activity';
import { CoachProfile } from '../types/coachProfile';
import {
  createActivitiesFromRequest,
  isCoachActivity,
} from './activityScheduler';
import { ParsedActivity, streamChatMessage } from './chatApi';

export interface PlanGenerationResult {
  createdActivities: Activity[];
  parsed: ParsedActivity[];
  content: string;
  // For partial-failure detection: distinct training days the model produced
  // for the base week vs. how many the profile asked for.
  scheduledDays: number;
  expectedDays: number;
}

interface GenerateParams {
  accessToken: string;
  coachProfile: CoachProfile;
  activityContext: string;
  dispatch: AppDispatch;
  onToken?: (text: string) => void;
  // The current activity list. When provided, any upcoming (today onward),
  // not-yet-completed coach-created activities are cleared once the new plan is
  // successfully scheduled — so regenerating replaces the old plan instead of
  // stacking on top of it. Completed/past workouts and manual entries are kept.
  existingActivities?: Activity[];
}

// Upcoming, not-yet-completed activities the coach previously scheduled. These
// are what a regenerate should replace. Captured before generation so the newly
// created activities (fresh ids) are never included.
function staleCoachActivityIds(activities: Activity[]): string[] {
  const today = dayjs().format('YYYY-MM-DD');
  return activities
    .filter(a => !a.completed && a.date >= today && isCoachActivity(a))
    .map(a => a.id);
}

/**
 * Generate a full plan from an onboarding profile and schedule it. Wraps the
 * mode:'plan' streaming call and feeds the result through the shared scheduler.
 * Returns an abort handle plus a promise that resolves when generation completes.
 *
 * The backend produces one representative week (each activity marked recurring),
 * and the scheduler replicates it across weeks — so the tool-call JSON stays
 * small and we avoid the multi-week truncation risk.
 */
export function generateAndSchedulePlan({
  accessToken,
  coachProfile,
  activityContext,
  dispatch,
  onToken,
  existingActivities,
}: GenerateParams): {
  abort: () => void;
  result: Promise<PlanGenerationResult>;
} {
  let handle: { abort: () => void } | null = null;

  // Snapshot the old plan to replace BEFORE generating, so the freshly created
  // activities (new ids) are never swept up by the clear.
  const idsToClear = existingActivities
    ? staleCoachActivityIds(existingActivities)
    : [];

  const result = new Promise<PlanGenerationResult>((resolve, reject) => {
    // The plan request is a synthetic user message; the real instruction lives
    // in the plan system prompt. Keywords keep token budgeting generous.
    const messages = [
      {
        role: 'user' as const,
        content:
          'Generate my full weekly workout plan and schedule it based on my profile.',
      },
    ];

    handle = streamChatMessage(
      accessToken,
      messages,
      {
        onToken: text => onToken?.(text),
        onDone: (content, parsed) => {
          try {
            const createdActivities = createActivitiesFromRequest(
              parsed,
              dispatch
            );
            // Only clear the previous plan once the new one is in place. A
            // failed/empty generation leaves the existing plan untouched. Uses
            // the soft-delete action so the removals tombstone and sync.
            if (createdActivities.length > 0) {
              for (const id of idsToClear) {
                dispatch(deleteActivity(id));
              }
            }
            const scheduledDays = new Set(parsed.map(p => p.date)).size;
            resolve({
              createdActivities,
              parsed,
              content,
              scheduledDays,
              expectedDays: coachProfile.daysPerWeek,
            });
          } catch (err) {
            reject(err);
          }
        },
        onError: message => reject(new Error(message)),
      },
      {
        activityContext,
        mode: 'plan',
        coachProfile,
      }
    );
  });

  return {
    abort: () => handle?.abort(),
    result,
  };
}
