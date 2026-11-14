import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { usePreferences } from '../context/PreferencesContext';
import {
  cancelUnfinishedWorkout,
  getPermissionStatus,
  scheduleUnfinishedWorkout,
} from '../services/notifications';
import { store } from '../redux/store';
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

  const evaluateAndSchedule = async (wasResumed: () => boolean) => {
    const status = await getPermissionStatus();
    if (status !== 'granted') return;

    for (const { id } of activitiesRef.current) {
      await scheduleUnfinishedWorkout(() => {
        const settings = settingsRef.current;
        if (!settings.enabled || !settings.unfinishedWorkout || wasResumed()) {
          return;
        }
        return store
          .getState()
          .activities.data.find(activity => activity.id === id);
      });
    }
  };

  useEffect(() => {
    const stateRef = { current: AppState.currentState as AppStateStatus };
    let foregroundCount = 0;
    const subscription = AppState.addEventListener('change', next => {
      const was = stateRef.current;
      stateRef.current = next;
      if (was === 'active' && next.match(/inactive|background/)) {
        const foregroundAtStart = foregroundCount;
        void evaluateAndSchedule(() => foregroundCount !== foregroundAtStart);
      } else if (was.match(/inactive|background/) && next === 'active') {
        foregroundCount += 1;
        activitiesRef.current.forEach(a => cancelUnfinishedWorkout(a.id));
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    return () => {
      void evaluateAndSchedule(() => false);
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
