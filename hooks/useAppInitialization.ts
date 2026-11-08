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
import { AppDispatch, RootState, store } from '../redux/store';
import { Activity } from '../types/activity';
import { loadTutorialCompleted } from '../utils/storage';

const MIN_SPLASH_TIME_MS = 300;

export function useAppInitialization() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    user,
    isLoading: authLoading,
    getAccessToken,
    isConfigured,
  } = useAuth();
  const activities = useSelector((state: RootState) => state.activities.data);

  const [activitiesLoaded, setActivitiesLoaded] = useState(false);
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
    (async () => {
      try {
        await dispatch(loadActivitiesFromStorage()).unwrap();
      } catch (error) {
        console.error('Failed to load activities from storage:', error);
      } finally {
        setActivitiesLoaded(true);
      }
    })();

    // Initialize exercise database and activity types from backend
    initializeExercises();
    initializeActivityTypes();

    (async () => {
      try {
        const completed = await loadTutorialCompleted();
        setShouldShowTutorial(!completed);
      } catch (error) {
        console.error('Failed to load tutorial completion state:', error);
        setShouldShowTutorial(false);
      } finally {
        setTutorialReady(true);
      }
    })();
  }, [dispatch]);

  // Auth ready check
  const authReady = !isConfigured || !authLoading;

  // Sync after local hydration without holding the splash screen open.
  useEffect(() => {
    const performSync = async () => {
      if (!user || !isConfigured || !isBackendConfigured()) {
        return;
      }

      // Wait for activities to be loaded first
      if (!activitiesLoaded) {
        return;
      }

      const token = getAccessToken();
      if (!token) {
        return;
      }

      try {
        await syncActivities(
          token,
          activitiesRef.current,
          handleActivitiesUpdated,
          {
            userId: user.id,
            getLatestActivities: () => store.getState().activities.data,
          }
        );

        // Sync user-specific data in parallel (non-blocking)
        Promise.all([fetchEquipment(token), fetchLibrary(token)]).catch(err =>
          console.error('Failed to sync user data:', err)
        );
      } catch (err) {
        console.error('Failed to sync activities during initialization:', err);
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
          activitiesLoaded &&
          user &&
          isConfigured &&
          isBackendConfigured()
        ) {
          const token = getAccessToken();
          if (token) {
            syncActivities(
              token,
              activitiesRef.current,
              handleActivitiesUpdated,
              {
                userId: user.id,
                getLatestActivities: () => store.getState().activities.data,
              }
            ).catch(err => console.error('Foreground sync failed:', err));
          }
        }
        appStateRef.current = nextAppState;
      }
    );

    return () => subscription.remove();
  }, [
    user,
    isConfigured,
    activitiesLoaded,
    getAccessToken,
    handleActivitiesUpdated,
  ]);

  const isReady =
    activitiesLoaded && authReady && minTimeElapsed && tutorialReady;

  return { isReady, shouldShowTutorial };
}
