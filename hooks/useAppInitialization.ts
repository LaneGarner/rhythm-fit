import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../context/AuthContext';
import { isBackendConfigured } from '../config/api';
import {
  loadActivitiesFromStorage,
  setActivities,
} from '../redux/activitySlice';
import { syncActivities } from '../services/syncService';
import { initializeExercises } from '../services/exerciseService';
import { initializeActivityTypes } from '../services/activityTypeService';
import { fetchEquipment } from '../services/equipmentService';
import { fetchLibrary } from '../services/libraryService';
import { fetchEmojiLibrary } from '../services/emojiLibraryService';
import { AppDispatch, RootState } from '../redux/store';
import { Activity } from '../types/activity';
import { loadTutorialCompleted } from '../utils/storage';

const MIN_SPLASH_TIME_MS = 1000;

export function useAppInitialization() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    user,
    isLoading: authLoading,
    getAccessToken,
    isConfigured,
  } = useAuth();
  const activities = useSelector((state: RootState) => state.activities.data);
  const activitiesLoading = useSelector(
    (state: RootState) => state.activities.loading
  );

  const [activitiesLoaded, setActivitiesLoaded] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [tutorialReady, setTutorialReady] = useState(false);
  const [shouldShowTutorial, setShouldShowTutorial] = useState(false);

  // Use ref to avoid re-triggering sync when activities change
  const activitiesRef = useRef<Activity[]>([]);
  activitiesRef.current = activities;

  const handleActivitiesUpdated = useCallback(
    (updatedActivities: Activity[]) => {
      dispatch(setActivities(updatedActivities));
    },
    [dispatch]
  );

  // Minimum splash time
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, MIN_SPLASH_TIME_MS);
    return () => clearTimeout(timer);
  }, []);

  // Load activities from storage and check tutorial status
  useEffect(() => {
    dispatch(loadActivitiesFromStorage()).then(() => {
      setActivitiesLoaded(true);
    });
    // Initialize exercise database and activity types from backend
    initializeExercises();
    initializeActivityTypes();
    // Check if tutorial has been completed
    loadTutorialCompleted().then(completed => {
      setShouldShowTutorial(!completed);
      setTutorialReady(true);
    });
  }, [dispatch]);

  // Track when activities finish loading (from thunk state)
  useEffect(() => {
    if (!activitiesLoading && activitiesLoaded) {
      // Already handled by the promise above
    }
  }, [activitiesLoading, activitiesLoaded]);

  // Auth ready check
  const authReady = !isConfigured || !authLoading;

  // Sync activities when user is authenticated
  useEffect(() => {
    const performSync = async () => {
      // If no user or backend not configured, sync is "complete" (nothing to do)
      if (!user || !isConfigured || !isBackendConfigured()) {
        setSyncComplete(true);
        return;
      }

      // Wait for activities to be loaded first
      if (!activitiesLoaded) {
        return;
      }

      const token = getAccessToken();
      if (!token) {
        setSyncComplete(true);
        return;
      }

      try {
        await syncActivities(
          token,
          activitiesRef.current,
          handleActivitiesUpdated
        );

        // Sync user-specific data in parallel (non-blocking)
        Promise.all([
          fetchEquipment(token),
          fetchLibrary(token),
          fetchEmojiLibrary(token),
        ]).catch(err => console.error('Failed to sync user data:', err));
      } catch (err) {
        console.error('Failed to sync activities during initialization:', err);
      } finally {
        setSyncComplete(true);
      }
    };

    performSync();
  }, [
    user,
    isConfigured,
    activitiesLoaded,
    getAccessToken,
    handleActivitiesUpdated,
  ]);

  // Re-sync when app returns to foreground
  useEffect(() => {
    const appStateRef = { current: AppState.currentState };

    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextAppState === 'active' &&
          user &&
          isConfigured &&
          isBackendConfigured()
        ) {
          const token = getAccessToken();
          if (token) {
            syncActivities(
              token,
              activitiesRef.current,
              handleActivitiesUpdated
            ).catch(err =>
              console.error('Foreground sync failed:', err)
            );
          }
        }
        appStateRef.current = nextAppState;
      }
    );

    return () => subscription.remove();
  }, [user, isConfigured, getAccessToken, handleActivitiesUpdated]);

  // Mark sync complete immediately if no backend/user
  useEffect(() => {
    if (!isConfigured || !isBackendConfigured()) {
      setSyncComplete(true);
    }
  }, [isConfigured]);

  const isReady =
    activitiesLoaded &&
    authReady &&
    syncComplete &&
    minTimeElapsed &&
    tutorialReady;

  return { isReady, shouldShowTutorial };
}
