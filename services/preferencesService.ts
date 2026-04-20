import { API_URL } from '../config/api';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NotificationSettings,
  WeekStartDay,
} from '../types/preferences';

interface PreferencesResponse {
  first_day_of_week: number;
  notification_settings?: Partial<NotificationSettings> | null;
}

export interface ServerPreferences {
  firstDayOfWeek: WeekStartDay;
  notificationSettings: NotificationSettings;
}

export async function fetchPreferences(
  accessToken: string
): Promise<ServerPreferences | null> {
  if (!API_URL) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/api/preferences`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const data: PreferencesResponse = await response.json();
      const firstDayOfWeek = data.first_day_of_week === 0 ? 0 : 1;
      const notificationSettings: NotificationSettings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...(data.notification_settings ?? {}),
      };
      return {
        firstDayOfWeek: firstDayOfWeek as WeekStartDay,
        notificationSettings,
      };
    }

    return null;
  } catch (err) {
    console.error('Failed to fetch preferences:', err);
    return null;
  }
}

export async function updatePreferences(
  accessToken: string,
  updates: {
    firstDayOfWeek?: WeekStartDay;
    notificationSettings?: NotificationSettings;
  }
): Promise<boolean> {
  if (!API_URL) {
    return false;
  }

  try {
    const body: Record<string, unknown> = {};
    if (updates.firstDayOfWeek !== undefined) {
      body.first_day_of_week = updates.firstDayOfWeek;
    }
    if (updates.notificationSettings !== undefined) {
      body.notification_settings = updates.notificationSettings;
    }

    const response = await fetch(`${API_URL}/api/preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    return response.ok;
  } catch (err) {
    console.error('Failed to update preferences:', err);
    return false;
  }
}
