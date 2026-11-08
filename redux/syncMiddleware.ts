import { Middleware, UnknownAction } from '@reduxjs/toolkit';
import {
  addManyToPendingSync,
  flushPendingSync,
} from '../services/syncService';
import { Activity } from '../types/activity';

// Type guard for actions with payload
interface ActionWithPayload<T = unknown> extends UnknownAction {
  payload: T;
}

// Auth token storage - set from AuthContext
let authToken: string | null = null;
let isConfigured = false;
let autoSyncTimer: ReturnType<typeof setTimeout> | null = null;
let retryDelayMs = 1000;
let retryAttempts = 0;

const AUTO_SYNC_DEBOUNCE_MS = 750;
const AUTO_SYNC_MAX_RETRY_MS = 60_000;
const AUTO_SYNC_MAX_RETRIES = 5;

function clearAutoSyncTimer() {
  if (autoSyncTimer) {
    clearTimeout(autoSyncTimer);
    autoSyncTimer = null;
  }
}

function scheduleAutoSync(delayMs = AUTO_SYNC_DEBOUNCE_MS, isRetry = false) {
  if (!isRetry) {
    retryDelayMs = 1000;
    retryAttempts = 0;
  }

  clearAutoSyncTimer();
  autoSyncTimer = setTimeout(async () => {
    autoSyncTimer = null;
    const token = authToken;
    if (!token || !isConfigured) return;

    const drained = await flushPendingSync(token);
    if (drained) {
      retryDelayMs = 1000;
      retryAttempts = 0;
      return;
    }

    if (retryAttempts >= AUTO_SYNC_MAX_RETRIES) return;

    const nextDelay = retryDelayMs;
    retryAttempts += 1;
    retryDelayMs = Math.min(retryDelayMs * 2, AUTO_SYNC_MAX_RETRY_MS);
    scheduleAutoSync(nextDelay, true);
  }, delayMs);
}

export function setSyncAuth(token: string | null, configured: boolean) {
  const authChanged = authToken !== token;
  authToken = token;
  isConfigured = configured;

  if (authChanged) {
    retryDelayMs = 1000;
    retryAttempts = 0;
  }
  if (!token || !configured) clearAutoSyncTimer();
}

// Activity action types to sync
const SYNC_ACTIONS = [
  'activities/addActivity',
  'activities/updateActivity',
  'activities/batchUpdateActivities',
  'activities/deleteActivity',
  'activities/deleteActivitiesForDate',
  'activities/markAllActivitiesCompleteForWeek',
  'activities/markAllActivitiesIncompleteForWeek',
  'activities/reorderActivities',
  'activities/createSuperset',
  'activities/addToSuperset',
  'activities/removeFromSuperset',
  'activities/breakSuperset',
  'activities/swapSupersetOrder',
];

export const syncMiddleware: Middleware = store => next => unknownAction => {
  const previousState = store.getState();

  // Always let the action pass through first (local update)
  const result = next(unknownAction);
  const action = unknownAction as ActionWithPayload;

  // Then sync in background if authenticated
  if (SYNC_ACTIONS.includes(action.type) && authToken && isConfigured) {
    const state = store.getState();

    const queued: (Activity & { updated_at: string; deleted_at?: string })[] =
      [];
    const enqueueForSync = async (activity: Activity, deleted = false) => {
      const now = new Date().toISOString();
      queued.push({
        ...activity,
        updated_at: now,
        deleted_at: deleted ? now : undefined,
      });
    };

    // Fire and forget - don't block the UI
    (async () => {
      try {
        if (action.type === 'activities/addActivity') {
          const activity = action.payload as Activity;
          await enqueueForSync(activity);
        } else if (action.type === 'activities/updateActivity') {
          const activity = action.payload as Activity;
          await enqueueForSync(activity);
        } else if (action.type === 'activities/batchUpdateActivities') {
          const updatedActivities = action.payload as Activity[];
          for (const activity of updatedActivities) {
            await enqueueForSync(activity);
          }
        } else if (action.type === 'activities/deleteActivity') {
          const activityId = action.payload as string;
          const previousActivities = previousState.activities
            .data as Activity[];
          const previousActivity = previousActivities.find(
            a => a.id === activityId
          );
          const deletedActivity: Activity = previousActivity || {
            id: activityId,
            date: '',
            type: 'other',
            name: '',
            completed: false,
          };
          await enqueueForSync(deletedActivity, true);
        } else if (action.type === 'activities/deleteActivitiesForDate') {
          const deletedDate = action.payload as string;
          const previousActivities = previousState.activities
            .data as Activity[];
          const deletedActivities = previousActivities.filter(
            a => a.date === deletedDate
          );
          for (const activity of deletedActivities) {
            await enqueueForSync(activity, true);
          }
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
            await enqueueForSync(activity);
          }
        } else if (action.type === 'activities/reorderActivities') {
          const { orderedIds } = action.payload as {
            date: string;
            orderedIds: string[];
          };
          const activities = state.activities.data as Activity[];
          for (const id of orderedIds) {
            const activity = activities.find(a => a.id === id);
            if (activity) {
              await enqueueForSync(activity);
            }
          }
        } else if (action.type === 'activities/createSuperset') {
          // Sync all activities that were added to the superset
          const { activityIds } = action.payload as { activityIds: string[] };
          const activities = state.activities.data as Activity[];
          for (const id of activityIds) {
            const activity = activities.find(a => a.id === id);
            if (activity) {
              await enqueueForSync(activity);
            }
          }
        } else if (action.type === 'activities/addToSuperset') {
          // Sync the activity that was added
          const { activityId } = action.payload as {
            supersetId: string;
            activityId: string;
          };
          const activities = state.activities.data as Activity[];
          const activity = activities.find(a => a.id === activityId);
          if (activity) {
            await enqueueForSync(activity);
          }
        } else if (action.type === 'activities/removeFromSuperset') {
          // Sync the removed activity and any remaining superset activities
          const activityId = action.payload as string;
          const activities = state.activities.data as Activity[];
          const activity = activities.find(a => a.id === activityId);
          if (activity) {
            await enqueueForSync(activity);
          }
          // Also sync remaining activities in the superset (positions may have changed)
          // Note: We can't easily get the old supersetId here, so we sync all activities
          // that were modified (they have recent updated_at)
        } else if (action.type === 'activities/breakSuperset') {
          // Sync all activities that were in the superset
          const activities = state.activities.data as Activity[];
          // Find activities that just had their superset cleared
          // (they won't have supersetId anymore but were just updated)
          const recentlyUpdated = activities.filter(
            a =>
              a.updated_at &&
              new Date().getTime() - new Date(a.updated_at).getTime() < 1000
          );
          for (const activity of recentlyUpdated) {
            await enqueueForSync(activity);
          }
        } else if (action.type === 'activities/swapSupersetOrder') {
          // Sync both swapped activities
          const { id1, id2 } = action.payload as {
            supersetId: string;
            id1: string;
            id2: string;
          };
          const activities = state.activities.data as Activity[];
          const activity1 = activities.find(a => a.id === id1);
          const activity2 = activities.find(a => a.id === id2);
          if (activity1) await enqueueForSync(activity1);
          if (activity2) await enqueueForSync(activity2);
        }

        // Upload shortly after the burst of activity changes settles. This
        // keeps the server (and Daily Brief) current without issuing one
        // request per Redux action.
        await addManyToPendingSync(queued);
        scheduleAutoSync();
      } catch (err) {
        console.error('Background sync failed:', err);
      }
    })();
  }

  return result;
};
