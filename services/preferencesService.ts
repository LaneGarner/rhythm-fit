import { API_URL } from '../config/api';
import { WeekStartDay } from '../types/preferences';

interface PreferencesResponse {
  first_day_of_week: number;
}

export async function fetchPreferences(
  accessToken: string
): Promise<{ firstDayOfWeek: WeekStartDay } | null> {
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
      // Ensure value is valid (0 or 1), default to 1 (Monday)
      const firstDayOfWeek = data.first_day_of_week === 0 ? 0 : 1;
      return { firstDayOfWeek: firstDayOfWeek as WeekStartDay };
    }

    return null;
  } catch (err) {
    console.error('Failed to fetch preferences:', err);
    return null;
  }
}

export async function updatePreferences(
  accessToken: string,
  firstDayOfWeek: WeekStartDay
): Promise<boolean> {
  if (!API_URL) {
    return false;
  }

  try {
    const response = await fetch(`${API_URL}/api/preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        first_day_of_week: firstDayOfWeek,
      }),
    });

    return response.ok;
  } catch (err) {
    console.error('Failed to update preferences:', err);
    return false;
  }
}
