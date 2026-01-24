import { Middleware } from '@reduxjs/toolkit';
import Constants from 'expo-constants';
import { Activity } from '../types/activity';

const API_URL =
  (Constants.expoConfig?.extra?.API_URL as string | undefined) ||
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  '';

// Auth token storage - set from AuthContext
let authToken: string | null = null;
let isConfigured = false;

export function setSyncAuth(token: string | null, configured: boolean) {
  authToken = token;
  isConfigured = configured;
}

// Push activity to server
async function pushToServer(
  token: string,
  activity: Activity,
  deleted: boolean = false
): Promise<void> {
  if (!API_URL) return;

  const syncableActivity = {
    ...activity,
    updated_at: new Date().toISOString(),
    deleted_at: deleted ? new Date().toISOString() : undefined,
  };

  await fetch(`${API_URL}/api/activities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      activities: [syncableActivity],
    }),
  });
}

// Activity action types to sync
const SYNC_ACTIONS = [
  'activities/addActivity',
  'activities/updateActivity',
  'activities/deleteActivity',
  'activities/markAllActivitiesCompleteForWeek',
  'activities/markAllActivitiesIncompleteForWeek',
];

export const syncMiddleware: Middleware = store => next => action => {
  // Always let the action pass through first (local update)
  const result = next(action);

  // Then sync in background if authenticated
  if (SYNC_ACTIONS.includes(action.type) && authToken && isConfigured) {
    const state = store.getState();

    // Fire and forget - don't block the UI
    (async () => {
      try {
        if (action.type === 'activities/addActivity') {
          const activity = action.payload as Activity;
          await pushToServer(authToken!, activity);
        } else if (action.type === 'activities/updateActivity') {
          const activity = action.payload as Activity;
          await pushToServer(authToken!, activity);
        } else if (action.type === 'activities/deleteActivity') {
          const activityId = action.payload as string;
          const deletedActivity: Activity = {
            id: activityId,
            date: '',
            type: 'other',
            name: '',
            completed: false,
          };
          await pushToServer(authToken!, deletedActivity, true);
        } else if (
          action.type === 'activities/markAllActivitiesCompleteForWeek' ||
          action.type === 'activities/markAllActivitiesIncompleteForWeek'
        ) {
          const weekDates = action.payload as string[];
          const activities = state.activities.data as Activity[];
          const affectedActivities = activities.filter(a =>
            weekDates.includes(a.date)
          );
          for (const activity of affectedActivities) {
            await pushToServer(authToken!, activity);
          }
        }
      } catch (err) {
        console.error('Background sync failed:', err);
      }
    })();
  }

  return result;
};
