import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Activity } from '../types/activity';
import { loadActivities, saveActivities } from '../utils/storage';
import {
  generateSupersetId,
  getNextSupersetPosition,
  getSupersetActivities,
} from '../utils/supersetUtils';

interface ActivityState {
  data: Activity[];
  loading: boolean;
  error: string | null;
}

const initialState: ActivityState = {
  data: [],
  loading: false,
  error: null,
};

// Thunk to load activities from storage on app startup
export const loadActivitiesFromStorage = createAsyncThunk(
  'activities/loadFromStorage',
  async () => {
    const activities = await loadActivities();
    return activities;
  }
);

const activitySlice = createSlice({
  name: 'activities',
  initialState,
  reducers: {
    addActivity(state, action: PayloadAction<Activity>) {
      const activityWithTimestamp = {
        ...action.payload,
        updated_at: new Date().toISOString(),
      };
      state.data.push(activityWithTimestamp);
      // Auto-save to storage
      saveActivities(state.data).catch(error => {
        console.error('Error saving activities to storage:', error);
      });
    },
    updateActivity(state, action: PayloadAction<Activity>) {
      const index = state.data.findIndex(a => a.id === action.payload.id);
      if (index !== -1) {
        state.data[index] = {
          ...action.payload,
          updated_at: new Date().toISOString(),
        };
      }
      // Auto-save to storage
      saveActivities(state.data).catch(error => {
        console.error('Error saving activities to storage:', error);
      });
    },
    deleteActivity(state, action: PayloadAction<string>) {
      const activityToDelete = state.data.find(a => a.id === action.payload);
      const supersetId = activityToDelete?.supersetId;

      state.data = state.data.filter(a => a.id !== action.payload);

      // Handle superset cleanup if the deleted activity was in a superset
      if (supersetId) {
        const now = new Date().toISOString();
        const remainingInSuperset = state.data.filter(
          a => a.supersetId === supersetId
        );

        if (remainingInSuperset.length === 1) {
          // Only one activity left - break the superset
          const lastIdx = state.data.findIndex(
            a => a.id === remainingInSuperset[0].id
          );
          if (lastIdx !== -1) {
            const {
              supersetId: _,
              supersetPosition: __,
              ...rest
            } = state.data[lastIdx];
            state.data[lastIdx] = { ...rest, updated_at: now };
          }
        } else if (remainingInSuperset.length > 1) {
          // Re-number positions
          const sorted = [...remainingInSuperset].sort(
            (a, b) => (a.supersetPosition || 0) - (b.supersetPosition || 0)
          );
          sorted.forEach((act, index) => {
            const idx = state.data.findIndex(a => a.id === act.id);
            if (idx !== -1) {
              state.data[idx] = {
                ...state.data[idx],
                supersetPosition: index + 1,
                updated_at: now,
              };
            }
          });
        }
      }

      // Auto-save to storage
      saveActivities(state.data).catch(error => {
        console.error('Error saving activities to storage:', error);
      });
    },
    deleteActivitiesForDate(state, action: PayloadAction<string>) {
      state.data = state.data.filter(a => a.date !== action.payload);
      // Auto-save to storage
      saveActivities(state.data).catch(error => {
        console.error('Error saving activities to storage:', error);
      });
    },
    setActivities(state, action: PayloadAction<Activity[]>) {
      state.data = action.payload;
      // Auto-save to storage
      saveActivities(state.data).catch(error => {
        console.error('Error saving activities to storage:', error);
      });
    },
    markAllActivitiesCompleteForWeek(state, action: PayloadAction<string[]>) {
      const weekDates = action.payload;
      const now = new Date().toISOString();
      state.data = state.data.map(activity =>
        weekDates.includes(activity.date)
          ? { ...activity, completed: true, updated_at: now }
          : activity
      );
      // Auto-save to storage
      saveActivities(state.data).catch(error => {
        console.error('Error saving activities to storage:', error);
      });
    },
    markAllActivitiesIncompleteForWeek(state, action: PayloadAction<string[]>) {
      const weekDates = action.payload;
      const now = new Date().toISOString();
      state.data = state.data.map(activity =>
        weekDates.includes(activity.date)
          ? { ...activity, completed: false, updated_at: now }
          : activity
      );
      // Auto-save to storage
      saveActivities(state.data).catch(error => {
        console.error('Error saving activities to storage:', error);
      });
    },
    clearAllActivities(state) {
      state.data = [];
      // Auto-save to storage
      saveActivities(state.data).catch(error => {
        console.error('Error saving activities to storage:', error);
      });
    },
    reorderActivities(
      state,
      action: PayloadAction<{ date: string; orderedIds: string[] }>
    ) {
      const { orderedIds } = action.payload;
      const now = new Date().toISOString();

      // Update order for each activity based on position in orderedIds array
      orderedIds.forEach((id, index) => {
        const activityIndex = state.data.findIndex(a => a.id === id);
        if (activityIndex !== -1) {
          state.data[activityIndex] = {
            ...state.data[activityIndex],
            order: index,
            updated_at: now,
          };
        }
      });

      // Auto-save to storage
      saveActivities(state.data).catch(error => {
        console.error('Error saving activities to storage:', error);
      });
    },
    createSuperset(state, action: PayloadAction<{ activityIds: string[] }>) {
      const { activityIds } = action.payload;
      if (activityIds.length < 2) return;

      const supersetId = generateSupersetId();
      const now = new Date().toISOString();

      activityIds.forEach((id, index) => {
        const activityIndex = state.data.findIndex(a => a.id === id);
        if (activityIndex !== -1) {
          state.data[activityIndex] = {
            ...state.data[activityIndex],
            supersetId,
            supersetPosition: index + 1,
            updated_at: now,
          };
        }
      });

      // Auto-save to storage
      saveActivities(state.data).catch(error => {
        console.error('Error saving activities to storage:', error);
      });
    },
    addToSuperset(
      state,
      action: PayloadAction<{ supersetId: string; activityId: string }>
    ) {
      const { supersetId, activityId } = action.payload;
      const now = new Date().toISOString();

      // Get existing activities in the superset
      const existingActivities = getSupersetActivities(state.data, supersetId);
      const nextPosition = getNextSupersetPosition(existingActivities);

      const activityIndex = state.data.findIndex(a => a.id === activityId);
      if (activityIndex !== -1) {
        state.data[activityIndex] = {
          ...state.data[activityIndex],
          supersetId,
          supersetPosition: nextPosition,
          updated_at: now,
        };
      }

      // Auto-save to storage
      saveActivities(state.data).catch(error => {
        console.error('Error saving activities to storage:', error);
      });
    },
    removeFromSuperset(state, action: PayloadAction<string>) {
      const activityId = action.payload;
      const now = new Date().toISOString();

      const activity = state.data.find(a => a.id === activityId);
      if (!activity?.supersetId) return;

      const supersetId = activity.supersetId;

      // Remove this activity from the superset
      const activityIndex = state.data.findIndex(a => a.id === activityId);
      if (activityIndex !== -1) {
        const {
          supersetId: _,
          supersetPosition: __,
          ...rest
        } = state.data[activityIndex];
        state.data[activityIndex] = {
          ...rest,
          updated_at: now,
        };
      }

      // Check remaining activities in the superset
      const remainingActivities = state.data.filter(
        a => a.supersetId === supersetId
      );

      // If only one activity remains, break the superset
      if (remainingActivities.length === 1) {
        const lastActivityIndex = state.data.findIndex(
          a => a.id === remainingActivities[0].id
        );
        if (lastActivityIndex !== -1) {
          const {
            supersetId: _,
            supersetPosition: __,
            ...rest
          } = state.data[lastActivityIndex];
          state.data[lastActivityIndex] = {
            ...rest,
            updated_at: now,
          };
        }
      } else {
        // Re-number positions for remaining activities
        const sorted = [...remainingActivities].sort(
          (a, b) => (a.supersetPosition || 0) - (b.supersetPosition || 0)
        );
        sorted.forEach((act, index) => {
          const idx = state.data.findIndex(a => a.id === act.id);
          if (idx !== -1) {
            state.data[idx] = {
              ...state.data[idx],
              supersetPosition: index + 1,
              updated_at: now,
            };
          }
        });
      }

      // Auto-save to storage
      saveActivities(state.data).catch(error => {
        console.error('Error saving activities to storage:', error);
      });
    },
    breakSuperset(state, action: PayloadAction<string>) {
      const supersetId = action.payload;
      const now = new Date().toISOString();

      state.data.forEach((activity, index) => {
        if (activity.supersetId === supersetId) {
          const { supersetId: _, supersetPosition: __, ...rest } = activity;
          state.data[index] = {
            ...rest,
            updated_at: now,
          };
        }
      });

      // Auto-save to storage
      saveActivities(state.data).catch(error => {
        console.error('Error saving activities to storage:', error);
      });
    },
    swapSupersetOrder(
      state,
      action: PayloadAction<{ supersetId: string; id1: string; id2: string }>
    ) {
      const { supersetId, id1, id2 } = action.payload;
      const now = new Date().toISOString();

      const idx1 = state.data.findIndex(a => a.id === id1);
      const idx2 = state.data.findIndex(a => a.id === id2);

      if (idx1 !== -1 && idx2 !== -1) {
        const pos1 = state.data[idx1].supersetPosition;
        const pos2 = state.data[idx2].supersetPosition;

        state.data[idx1] = {
          ...state.data[idx1],
          supersetPosition: pos2,
          updated_at: now,
        };
        state.data[idx2] = {
          ...state.data[idx2],
          supersetPosition: pos1,
          updated_at: now,
        };
      }

      // Auto-save to storage
      saveActivities(state.data).catch(error => {
        console.error('Error saving activities to storage:', error);
      });
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loadActivitiesFromStorage.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadActivitiesFromStorage.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(loadActivitiesFromStorage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load activities';
      });
  },
});

export const {
  addActivity,
  updateActivity,
  deleteActivity,
  setActivities,
  deleteActivitiesForDate,
  markAllActivitiesCompleteForWeek,
  markAllActivitiesIncompleteForWeek,
  clearAllActivities,
  reorderActivities,
  createSuperset,
  addToSuperset,
  removeFromSuperset,
  breakSuperset,
  swapSupersetOrder,
} = activitySlice.actions;
export default activitySlice.reducer;
