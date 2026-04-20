export type WeekStartDay = 0 | 1; // 0 = Sunday, 1 = Monday

export interface NotificationSettings {
  enabled: boolean;
  unfinishedWorkout: boolean;
  timerCompletion: boolean;
  scheduledReminder: boolean;
  scheduledReminderTime: string; // "HH:MM" 24h
  inactivityNudge: boolean;
  inactivityThresholdDays: number;
  inactivityTime: string; // "HH:MM"
  weeklySummary: boolean;
  weeklySummaryTime: string; // "HH:MM" — fires Sunday at this time
}

export interface UserPreferences {
  firstDayOfWeek: WeekStartDay;
  notificationSettings: NotificationSettings;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  unfinishedWorkout: true,
  timerCompletion: true,
  scheduledReminder: true,
  scheduledReminderTime: '09:00',
  inactivityNudge: true,
  inactivityThresholdDays: 3,
  inactivityTime: '18:00',
  weeklySummary: true,
  weeklySummaryTime: '18:00',
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  firstDayOfWeek: 1, // Monday (matches current behavior)
  notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
};
