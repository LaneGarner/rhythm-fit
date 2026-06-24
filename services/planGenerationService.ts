import { AppDispatch } from '../redux/store';
import { Activity } from '../types/activity';
import { CoachProfile } from '../types/coachProfile';
import { createActivitiesFromRequest } from './activityScheduler';
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
}: GenerateParams): {
  abort: () => void;
  result: Promise<PlanGenerationResult>;
} {
  let handle: { abort: () => void } | null = null;

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
