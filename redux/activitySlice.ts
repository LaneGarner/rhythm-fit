import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Activity } from '../types/activity';

interface ActivityState {
  data: Activity[];
}

const initialState: ActivityState = {
  data: [],
};

const activitySlice = createSlice({
  name: 'activities',
  initialState,
  reducers: {
    addActivity(state, action: PayloadAction<Activity>) {
      state.data.push(action.payload);
    },
    updateActivity(state, action: PayloadAction<Activity>) {
      const index = state.data.findIndex(a => a.id === action.payload.id);
      if (index !== -1) state.data[index] = action.payload;
    },
    deleteActivity(state, action: PayloadAction<string>) {
      state.data = state.data.filter(a => a.id !== action.payload);
    },
    deleteActivitiesForDate(state, action: PayloadAction<string>) {
      state.data = state.data.filter(a => a.date !== action.payload);
    },
    setActivities(state, action: PayloadAction<Activity[]>) {
      state.data = action.payload;
    },
    markAllActivitiesCompleteForWeek(state, action: PayloadAction<string[]>) {
      const weekDates = action.payload;
      state.data = state.data.map(activity =>
        weekDates.includes(activity.date)
          ? { ...activity, completed: true }
          : activity
      );
    },
    markAllActivitiesIncompleteForWeek(state, action: PayloadAction<string[]>) {
      const weekDates = action.payload;
      state.data = state.data.map(activity =>
        weekDates.includes(activity.date)
          ? { ...activity, completed: false }
          : activity
      );
    },
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
