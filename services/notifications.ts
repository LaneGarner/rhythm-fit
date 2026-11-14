import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import dayjs from 'dayjs';
import { Activity } from '../types/activity';
import { NotificationSettings } from '../types/preferences';

// Fixed identifiers so we can cancel/reschedule without tracking dynamic ids.
export const NOTIFICATION_IDS = {
  timerCompletion: 'rhythm.timer.completion',
  restTimer: 'rhythm.timer.rest',
  unfinishedWorkoutPrefix: 'rhythm.workout.unfinished.',
  scheduledReminder: 'rhythm.workout.scheduledReminder',
  inactivityNudge: 'rhythm.workout.inactivityNudge',
  weeklySummary: 'rhythm.workout.weeklySummary',
} as const;

export type NotificationKind =
  | 'timer-completion'
  | 'rest-timer'
  | 'unfinished-workout'
  | 'scheduled-reminder'
  | 'inactivity-nudge'
  | 'weekly-summary';

export interface NotificationPayload {
  kind: NotificationKind;
  activityId?: string;
  date?: string;
}

let handlerConfigured = false;

export function configureNotificationHandler() {
  if (handlerConfigured) return;
  handlerConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async notification => {
      const rawData = notification.request.content.data;
      let kind: string | undefined;
      if (typeof rawData === 'string') {
        try {
          kind = JSON.parse(rawData)?.kind;
        } catch {
          kind = undefined;
        }
      } else {
        kind = (rawData as unknown as NotificationPayload | undefined)?.kind;
      }
      const isTimerKind = kind === 'timer-completion' || kind === 'rest-timer';
      const isForeground = AppState.currentState === 'active';
      const suppress = isTimerKind && isForeground;
      return {
        shouldShowBanner: !suppress,
        shouldShowList: !suppress,
        shouldPlaySound: !suppress,
        shouldSetBadge: false,
      };
    },
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    }).catch(() => {});
  }
}

export async function getPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function requestPermission(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
  return status;
}

export async function cancelById(identifier: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // ignore — not scheduled
  }
}

export async function cancelAllRhythmNotifications() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter(n => n.identifier.startsWith('rhythm.'))
        .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {
    // ignore
  }
}

async function schedule(
  identifier: string,
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput,
  payload: NotificationPayload
) {
  const triggerWithChannel =
    trigger && typeof trigger === 'object'
      ? { ...trigger, channelId: 'default' }
      : trigger;

  await cancelById(identifier);
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      data: payload as unknown as Record<string, unknown>,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
      interruptionLevel: 'active',
    },
    trigger: triggerWithChannel,
  });
}

export async function scheduleTimerCompletion(
  activityName: string,
  completionAt: number,
  kind: 'timer-completion' | 'rest-timer' = 'timer-completion'
) {
  const identifier =
    kind === 'rest-timer'
      ? NOTIFICATION_IDS.restTimer
      : NOTIFICATION_IDS.timerCompletion;

  const seconds = Math.max(1, Math.ceil((completionAt - Date.now()) / 1000));
  await schedule(
    identifier,
    kind === 'rest-timer' ? 'Rest complete' : 'Timer complete',
    `Your timer for "${activityName}" is done.`,
    {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
    },
    { kind }
  );
}

export async function cancelTimerCompletion(
  kind: 'timer-completion' | 'rest-timer' = 'timer-completion'
) {
  await cancelById(
    kind === 'rest-timer'
      ? NOTIFICATION_IDS.restTimer
      : NOTIFICATION_IDS.timerCompletion
  );
}

let unfinishedWorkoutWork: Promise<void> = Promise.resolve();

function queueUnfinishedWorkoutWork(work: () => Promise<void>) {
  unfinishedWorkoutWork = unfinishedWorkoutWork.then(work).catch(() => {});
  return unfinishedWorkoutWork;
}

export function getUnfinishedWorkoutProgress(activity: Activity | undefined) {
  if (!activity || activity.completed) return;
  const sets = activity.sets ?? [];
  const completed = sets.filter(set => set.completed).length;
  if (completed > 0 && completed < sets.length) {
    return { completed, total: sets.length };
  }
}

export function scheduleUnfinishedWorkout(
  getActivity: () => Activity | undefined
) {
  return queueUnfinishedWorkoutWork(async () => {
    const activity = getActivity();
    const progress = getUnfinishedWorkoutProgress(activity);
    if (!activity || !progress) return;

    await schedule(
      `${NOTIFICATION_IDS.unfinishedWorkoutPrefix}${activity.id}`,
      'Finish your workout',
      `${activity.name} — ${progress.completed} of ${progress.total} sets done.`,
      {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 30 * 60,
      },
      {
        kind: 'unfinished-workout',
        activityId: activity.id,
        date: activity.date,
      }
    );
  });
}

export function cancelUnfinishedWorkout(activityId: string) {
  return queueUnfinishedWorkoutWork(() =>
    cancelById(`${NOTIFICATION_IDS.unfinishedWorkoutPrefix}${activityId}`)
  );
}

export function reconcileUnfinishedWorkouts(
  getActivities: () => Activity[],
  enabled: boolean
) {
  return queueUnfinishedWorkoutWork(async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const activities = new Map(
      getActivities().map(activity => [activity.id, activity])
    );
    const prefix = NOTIFICATION_IDS.unfinishedWorkoutPrefix;

    await Promise.all(
      scheduled
        .filter(
          ({ identifier }) =>
            identifier.startsWith(prefix) &&
            (!enabled ||
              !getUnfinishedWorkoutProgress(
                activities.get(identifier.slice(prefix.length))
              ))
        )
        .map(({ identifier }) => cancelById(identifier))
    );
  });
}

function parseHHMM(value: string): { hour: number; minute: number } {
  const [hStr, mStr] = value.split(':');
  const hour = Math.max(0, Math.min(23, parseInt(hStr, 10) || 0));
  const minute = Math.max(0, Math.min(59, parseInt(mStr, 10) || 0));
  return { hour, minute };
}

async function scheduleScheduledReminder(
  todayActivities: Activity[],
  time: string
) {
  const incomplete = todayActivities.filter(a => !a.completed);
  if (incomplete.length === 0) {
    await cancelById(NOTIFICATION_IDS.scheduledReminder);
    return;
  }

  const { hour, minute } = parseHHMM(time);
  const body =
    incomplete.length === 1
      ? `Today: ${incomplete[0].name}`
      : `You have ${incomplete.length} workouts scheduled today.`;

  await schedule(
    NOTIFICATION_IDS.scheduledReminder,
    'Workout reminder',
    body,
    {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
    {
      kind: 'scheduled-reminder',
      date: dayjs().format('YYYY-MM-DD'),
    }
  );
}

async function scheduleInactivityNudge(
  daysSinceLastCompleted: number,
  threshold: number,
  time: string
) {
  if (daysSinceLastCompleted < threshold) {
    await cancelById(NOTIFICATION_IDS.inactivityNudge);
    return;
  }

  const { hour, minute } = parseHHMM(time);
  await schedule(
    NOTIFICATION_IDS.inactivityNudge,
    'Stay in rhythm',
    daysSinceLastCompleted === Infinity
      ? 'Ready when you are — log a workout today.'
      : `It's been ${daysSinceLastCompleted} days since your last workout.`,
    {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
    { kind: 'inactivity-nudge' }
  );
}

async function scheduleWeeklySummary(completedLastWeek: number, time: string) {
  const { hour, minute } = parseHHMM(time);
  await schedule(
    NOTIFICATION_IDS.weeklySummary,
    'Weekly recap',
    completedLastWeek > 0
      ? `You completed ${completedLastWeek} workout${completedLastWeek === 1 ? '' : 's'} this week.`
      : 'Fresh week ahead — pick your first workout.',
    {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // 1 = Sunday per expo-notifications spec
      hour,
      minute,
    },
    { kind: 'weekly-summary' }
  );
}

function daysSinceLastCompletedActivity(activities: Activity[]): number {
  let latest = '';
  for (const activity of activities)
    if (activity.completed && activity.date > latest) latest = activity.date;
  return latest
    ? dayjs().startOf('day').diff(dayjs(latest).startOf('day'), 'day')
    : Infinity;
}

function countCompletedThisWeek(activities: Activity[]): number {
  const startOfWeek = dayjs().startOf('week');
  const endOfWeek = dayjs().endOf('week');
  return activities.filter(a => {
    if (!a.completed) return false;
    const d = dayjs(a.date);
    return d.isAfter(startOfWeek.subtract(1, 'day')) && d.isBefore(endOfWeek);
  }).length;
}

// Master orchestrator: cancels stale, reschedules based on current state.
async function performNotificationEvaluation(
  settings: NotificationSettings,
  activities: Activity[],
  hasPermission: boolean
) {
  if (!hasPermission || !settings.enabled) {
    await cancelById(NOTIFICATION_IDS.scheduledReminder);
    await cancelById(NOTIFICATION_IDS.inactivityNudge);
    await cancelById(NOTIFICATION_IDS.weeklySummary);
    return;
  }

  const today = dayjs().format('YYYY-MM-DD');
  const todays = activities.filter(a => a.date === today);

  if (settings.scheduledReminder) {
    await scheduleScheduledReminder(todays, settings.scheduledReminderTime);
  } else {
    await cancelById(NOTIFICATION_IDS.scheduledReminder);
  }

  if (settings.inactivityNudge) {
    const days = daysSinceLastCompletedActivity(activities);
    await scheduleInactivityNudge(
      days,
      settings.inactivityThresholdDays,
      settings.inactivityTime
    );
  } else {
    await cancelById(NOTIFICATION_IDS.inactivityNudge);
  }

  if (settings.weeklySummary) {
    await scheduleWeeklySummary(
      countCompletedThisWeek(activities),
      settings.weeklySummaryTime
    );
  } else {
    await cancelById(NOTIFICATION_IDS.weeklySummary);
  }
}

// Serialize native scheduling and skip unchanged plans after history syncs.
let notificationWork: Promise<void> = Promise.resolve();
let lastPlan: string | null = null;
export function evaluateAndScheduleNotifications(
  settings: NotificationSettings,
  activities: Activity[],
  hasPermission: boolean
): Promise<void> {
  const run = notificationWork
    .catch(() => {})
    .then(async () => {
      const today = dayjs().format('YYYY-MM-DD');
      const plan = JSON.stringify({
        settings,
        hasPermission,
        today,
        todayActivities: activities
          .filter(a => a.date === today)
          .map(a => [a.id, a.name, a.completed]),
        inactivity: daysSinceLastCompletedActivity(activities),
        weekly: countCompletedThisWeek(activities),
      });
      if (plan === lastPlan) return;
      await performNotificationEvaluation(settings, activities, hasPermission);
      lastPlan = plan;
    });
  notificationWork = run;
  return run;
}
