import { configureStore } from '@reduxjs/toolkit';
import activityReducer from './activitySlice';
import { persistMiddleware } from './persistMiddleware';
import { syncMiddleware } from './syncMiddleware';

export const store = configureStore({
  reducer: {
    activities: activityReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(persistMiddleware, syncMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
