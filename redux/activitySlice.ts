import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Activity } from '../types/activity';
import { loadActivities, saveActivities } from '../utils/storage';

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
    console.log('Loading activities from storage...');
    const activities = await loadActivities();
    console.log('Loaded activities from storage:', activities.length);
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
      console.log('Adding activity to Redux:', action.payload.name);
      // Auto-save to storage
      saveActivities(state.data)
        .then(() => {
          console.log('Activities saved to storage successfully');
        })
        .catch(error => {
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
      console.log('Updating activity in Redux:', action.payload.name);
      // Auto-save to storage
      saveActivities(state.data)
        .then(() => {
          console.log('Activities saved to storage successfully');
        })
        .catch(error => {
          console.error('Error saving activities to storage:', error);
        });
    },
    deleteActivity(state, action: PayloadAction<string>) {
      state.data = state.data.filter(a => a.id !== action.payload);
      console.log('Deleting activity from Redux:', action.payload);
      // Auto-save to storage
      saveActivities(state.data)
        .then(() => {
          console.log('Activities saved to storage successfully');
        })
        .catch(error => {
          console.error('Error saving activities to storage:', error);
        });
    },
    deleteActivitiesForDate(state, action: PayloadAction<string>) {
      state.data = state.data.filter(a => a.date !== action.payload);
      console.log('Deleting activities for date from Redux:', action.payload);
      // Auto-save to storage
      saveActivities(state.data)
        .then(() => {
          console.log('Activities saved to storage successfully');
        })
        .catch(error => {
          console.error('Error saving activities to storage:', error);
        });
    },
    setActivities(state, action: PayloadAction<Activity[]>) {
      state.data = action.payload;
      console.log('Setting activities in Redux:', action.payload.length);
      // Auto-save to storage
      saveActivities(state.data)
        .then(() => {
          console.log('Activities saved to storage successfully');
        })
        .catch(error => {
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
      console.log('Marking activities complete for week in Redux');
      // Auto-save to storage
      saveActivities(state.data)
        .then(() => {
          console.log('Activities saved to storage successfully');
        })
        .catch(error => {
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
      console.log('Marking activities incomplete for week in Redux');
      // Auto-save to storage
      saveActivities(state.data)
        .then(() => {
          console.log('Activities saved to storage successfully');
        })
        .catch(error => {
          console.error('Error saving activities to storage:', error);
        });
    },
    clearAllActivities(state) {
      state.data = [];
      console.log('All activities cleared from Redux store');
      // Auto-save to storage
      saveActivities(state.data)
        .then(() => {
          console.log('Activities saved to storage successfully');
        })
        .catch(error => {
          console.error('Error saving activities to storage:', error);
        });
    },
    reorderActivities(
      state,
      action: PayloadAction<{ date: string; orderedIds: string[] }>
    ) {
      const { date, orderedIds } = action.payload;
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

      console.log('Reordering activities for date:', date);
      // Auto-save to storage
      saveActivities(state.data)
        .then(() => {
          console.log('Activities saved to storage successfully');
        })
        .catch(error => {
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
} = activitySlice.actions;
export default activitySlice.reducer;
