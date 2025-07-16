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
    const activities = await loadActivities();
    return activities;
  }
);

const activitySlice = createSlice({
  name: 'activities',
  initialState,
  reducers: {
    addActivity(state, action: PayloadAction<Activity>) {
      state.data.push(action.payload);
      // Auto-save to storage
      saveActivities(state.data);
    },
    updateActivity(state, action: PayloadAction<Activity>) {
      const index = state.data.findIndex(a => a.id === action.payload.id);
      if (index !== -1) state.data[index] = action.payload;
      // Auto-save to storage
      saveActivities(state.data);
    },
    deleteActivity(state, action: PayloadAction<string>) {
      state.data = state.data.filter(a => a.id !== action.payload);
      // Auto-save to storage
      saveActivities(state.data);
    },
    deleteActivitiesForDate(state, action: PayloadAction<string>) {
      state.data = state.data.filter(a => a.date !== action.payload);
      // Auto-save to storage
      saveActivities(state.data);
    },
    setActivities(state, action: PayloadAction<Activity[]>) {
      state.data = action.payload;
      // Auto-save to storage
      saveActivities(state.data);
    },
    markAllActivitiesCompleteForWeek(state, action: PayloadAction<string[]>) {
      const weekDates = action.payload;
      state.data = state.data.map(activity =>
        weekDates.includes(activity.date)
          ? { ...activity, completed: true }
          : activity
      );
      // Auto-save to storage
      saveActivities(state.data);
    },
    markAllActivitiesIncompleteForWeek(state, action: PayloadAction<string[]>) {
      const weekDates = action.payload;
      state.data = state.data.map(activity =>
        weekDates.includes(activity.date)
          ? { ...activity, completed: false }
          : activity
      );
      // Auto-save to storage
      saveActivities(state.data);
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
} = activitySlice.actions;
export default activitySlice.reducer;
