import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { usePreferences } from '../context/PreferencesContext';
import {
  cancelUnfinishedWorkout,
  getPermissionStatus,
  scheduleUnfinishedWorkout,
} from '../services/notifications';
import { Activity } from '../types/activity';

// Shared execution reminder lifecycle for one or several activities.
export function useUnfinishedWorkoutNotifications(activities: Activity[]) {
  const { notificationSettings } = usePreferences();
  const activitiesRef = useRef(activities);
  const settingsRef = useRef(notificationSettings);

  useEffect(() => {
    activitiesRef.current = activities;
  }, [activities]);

  useEffect(() => {
    settingsRef.current = notificationSettings;
  }, [notificationSettings]);

  // Cancel notifications as activities become completed.
  useEffect(() => {
    activities.forEach(a => {
      if (a.completed) cancelUnfinishedWorkout(a.id);
    });
  }, [activities]);

  const evaluateAndSchedule = async () => {
    const settings = settingsRef.current;
    if (!settings.enabled || !settings.unfinishedWorkout) return;
    const status = await getPermissionStatus();
    if (status !== 'granted') return;

    for (const activity of activitiesRef.current) {
      if (activity.completed) continue;
      const sets = activity.sets ?? [];
      const completed = sets.filter(s => s.completed).length;
      if (completed > 0 && completed < sets.length) {
        await scheduleUnfinishedWorkout(activity, completed, sets.length, 30);
      }
    }
  };

  useEffect(() => {
    const stateRef = { current: AppState.currentState as AppStateStatus };
    const subscription = AppState.addEventListener('change', next => {
      const was = stateRef.current;
      stateRef.current = next;
      if (was === 'active' && next.match(/inactive|background/)) {
        evaluateAndSchedule();
      } else if (was.match(/inactive|background/) && next === 'active') {
        activitiesRef.current.forEach(a => cancelUnfinishedWorkout(a.id));
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    return () => {
      evaluateAndSchedule();
    };
  }, []);
}

// Compatibility wrappers for callers outside the unified execution screen.
export function useUnfinishedWorkoutNotification(
  activity: Activity | undefined
) {
  useUnfinishedWorkoutNotifications(activity ? [activity] : []);
}
export const useUnfinishedSupersetNotification =
  useUnfinishedWorkoutNotifications;
