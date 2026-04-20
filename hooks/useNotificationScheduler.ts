import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSelector } from 'react-redux';
import { usePreferences } from '../context/PreferencesContext';
import { RootState } from '../redux/store';
import {
  evaluateAndScheduleNotifications,
  getPermissionStatus,
} from '../services/notifications';

// Debounced re-evaluation of scheduled notifications on activity/preference
// change and on foreground. Permission-gated — no-ops if user hasn't granted.
export function useNotificationScheduler() {
  const activities = useSelector((state: RootState) => state.activities.data);
  const { notificationSettings, isLoading } = usePreferences();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const status = await getPermissionStatus();
      await evaluateAndScheduleNotifications(
        notificationSettings,
        activities,
        status === 'granted'
      );
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [activities, notificationSettings, isLoading]);

  // Re-evaluate when app returns to foreground (day may have rolled over,
  // notifications may have fired, etc.)
  useEffect(() => {
    const appStateRef = { current: AppState.currentState as AppStateStatus };
    const subscription = AppState.addEventListener('change', async next => {
      const wasBackgrounded = appStateRef.current.match(/inactive|background/);
      appStateRef.current = next;
      if (wasBackgrounded && next === 'active' && !isLoading) {
        const status = await getPermissionStatus();
        await evaluateAndScheduleNotifications(
          notificationSettings,
          activities,
          status === 'granted'
        );
      }
    });
    return () => subscription.remove();
  }, [activities, notificationSettings, isLoading]);
}
