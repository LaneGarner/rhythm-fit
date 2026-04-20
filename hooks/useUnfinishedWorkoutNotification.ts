import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { usePreferences } from '../context/PreferencesContext';
import {
  cancelUnfinishedWorkout,
  getPermissionStatus,
  scheduleUnfinishedWorkout,
} from '../services/notifications';
import { Activity } from '../types/activity';

// While the execution screen is open, cancel any pending unfinished-workout
// notification for this activity. On unmount or app background, if the user
// made partial progress (>=1 set completed) but didn't finish the activity,
// schedule a reminder.
export function useUnfinishedWorkoutNotification(
  activity: Activity | undefined
) {
  const { notificationSettings } = usePreferences();
  const activityRef = useRef(activity);
  const settingsRef = useRef(notificationSettings);

  useEffect(() => {
    activityRef.current = activity;
  }, [activity]);

  useEffect(() => {
    settingsRef.current = notificationSettings;
  }, [notificationSettings]);

  // Cancel when the activity becomes fully completed.
  useEffect(() => {
    if (activity?.id && activity.completed) {
      cancelUnfinishedWorkout(activity.id);
    }
  }, [activity?.id, activity?.completed]);

  const shouldSchedule = (): boolean => {
    const current = activityRef.current;
    const settings = settingsRef.current;
    if (!current) return false;
    if (current.completed) return false;
    if (!settings.enabled || !settings.unfinishedWorkout) return false;
    const sets = current.sets ?? [];
    const completedCount = sets.filter(s => s.completed).length;
    return completedCount > 0 && completedCount < sets.length;
  };

  const scheduleIfEligible = async () => {
    const current = activityRef.current;
    if (!current || !shouldSchedule()) return;
    const status = await getPermissionStatus();
    if (status !== 'granted') return;
    const sets = current.sets ?? [];
    const completed = sets.filter(s => s.completed).length;
    await scheduleUnfinishedWorkout(current, completed, sets.length, 30);
  };

  // Schedule on background; clear on foreground return (user is back in the app).
  useEffect(() => {
    const stateRef = { current: AppState.currentState as AppStateStatus };
    const subscription = AppState.addEventListener('change', next => {
      const was = stateRef.current;
      stateRef.current = next;
      if (was === 'active' && next.match(/inactive|background/)) {
        scheduleIfEligible();
      } else if (
        was.match(/inactive|background/) &&
        next === 'active' &&
        activityRef.current?.id
      ) {
        cancelUnfinishedWorkout(activityRef.current.id);
      }
    });
    return () => subscription.remove();
  }, []);

  // Schedule on screen unmount (navigating away) — the snapshot in refs is
  // the latest Redux-backed activity state.
  useEffect(() => {
    return () => {
      scheduleIfEligible();
    };
  }, []);
}

// Variant for supersets: schedule/cancel per activity in the group.
export function useUnfinishedSupersetNotification(activities: Activity[]) {
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
