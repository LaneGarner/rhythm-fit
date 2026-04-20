import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
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
      const kind = (notification.request.content.data as NotificationPayload)
        ?.kind;
      const suppressInForeground =
        kind === 'timer-completion' || kind === 'rest-timer';
      return {
        shouldShowBanner: !suppressInForeground,
        shouldShowList: !suppressInForeground,
        shouldPlaySound: !suppressInForeground,
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
  await cancelById(identifier);
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      data: payload as unknown as Record<string, unknown>,
      sound: 'default',
    },
    trigger,
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

export async function scheduleUnfinishedWorkout(
  activity: Activity,
  completedSetsCount: number,
  totalSetsCount: number,
  delayMinutes: number = 30
) {
  const identifier = `${NOTIFICATION_IDS.unfinishedWorkoutPrefix}${activity.id}`;
  await schedule(
    identifier,
    'Finish your workout',
    `${activity.name} — ${completedSetsCount} of ${totalSetsCount} sets done.`,
    {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(60, delayMinutes * 60),
    },
    { kind: 'unfinished-workout', activityId: activity.id, date: activity.date }
  );
}

export async function cancelUnfinishedWorkout(activityId: string) {
  await cancelById(`${NOTIFICATION_IDS.unfinishedWorkoutPrefix}${activityId}`);
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
  const completedDates = activities
    .filter(a => a.completed)
    .map(a => dayjs(a.date));
  if (completedDates.length === 0) return Infinity;
  const latest = completedDates.sort((a, b) => b.valueOf() - a.valueOf())[0];
  return dayjs().startOf('day').diff(latest.startOf('day'), 'day');
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
export async function evaluateAndScheduleNotifications(
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
