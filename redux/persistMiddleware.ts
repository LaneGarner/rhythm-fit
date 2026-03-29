import { Middleware } from '@reduxjs/toolkit';
import { saveActivities } from '../utils/storage';

const PERSIST_ACTIONS = [
  'activities/addActivity',
  'activities/updateActivity',
  'activities/batchUpdateActivities',
  'activities/deleteActivity',
  'activities/deleteActivitiesForDate',
  'activities/setActivities',
  'activities/markAllActivitiesCompleteForWeek',
  'activities/markAllActivitiesIncompleteForWeek',
  'activities/clearAllActivities',
  'activities/reorderActivities',
  'activities/createSuperset',
  'activities/addToSuperset',
  'activities/removeFromSuperset',
  'activities/breakSuperset',
  'activities/swapSupersetOrder',
];

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const persistMiddleware: Middleware = store => next => action => {
  const result = next(action);

  if (
    typeof action === 'object' &&
    action !== null &&
    'type' in action &&
    typeof (action as { type: unknown }).type === 'string' &&
    PERSIST_ACTIONS.includes((action as { type: string }).type)
  ) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      const state = store.getState();
      saveActivities(state.activities.data).catch(error => {
        console.error('Error persisting activities to storage:', error);
      });
      debounceTimer = null;
    }, 150);
  }

  return result;
};
