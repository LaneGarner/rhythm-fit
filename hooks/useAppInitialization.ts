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
import { AppDispatch, RootState } from '../redux/store';
import { Activity } from '../types/activity';
import { loadTutorialCompleted } from '../utils/storage';

const MIN_SPLASH_TIME_MS = 1000;
const STARTUP_TIMEOUT_MS = 15000;

function logStartup(message: string, details?: unknown) {
  if (details === undefined) {
    console.log(`[startup] ${message}`);
    return;
  }

  console.log(`[startup] ${message}`, details);
}

function logStartupError(message: string, error: unknown) {
  console.warn(`[startup] ${message}`, error);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

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
  const [startupTimedOut, setStartupTimedOut] = useState(false);
  const [startupStatus, setStartupStatus] = useState('Starting up');
  const [startupError, setStartupError] = useState<string | null>(null);

  // Use ref to avoid re-triggering sync when activities change
  const activitiesRef = useRef<Activity[]>([]);
  activitiesRef.current = activities;

  const readinessSnapshotRef = useRef({
    activitiesLoaded,
    authLoading,
    hasUser: Boolean(user),
    isConfigured,
    syncComplete,
    minTimeElapsed,
    tutorialReady,
  });
  readinessSnapshotRef.current = {
    activitiesLoaded,
    authLoading,
    hasUser: Boolean(user),
    isConfigured,
    syncComplete,
    minTimeElapsed,
    tutorialReady,
  };

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

  // Fail open after a bounded wait so TestFlight does not sit on the splash
  // forever if one of the startup promises stalls.
  useEffect(() => {
    const timer = setTimeout(() => {
      const snapshot = readinessSnapshotRef.current;
      logStartupError(`startup timeout after ${STARTUP_TIMEOUT_MS}ms`, snapshot);
      setStartupStatus('Startup timed out');
      setStartupError(JSON.stringify(snapshot));
      setStartupTimedOut(true);
    }, STARTUP_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, []);

  // Load activities from storage and check tutorial status
  useEffect(() => {
    logStartup('bootstrap begin');
    setStartupStatus('Loading saved workouts');

    (async () => {
      logStartup('loading activities from storage');
      try {
        await dispatch(loadActivitiesFromStorage()).unwrap();
        logStartup('activities loaded');
      } catch (error) {
        logStartupError('failed to load activities from storage', error);
        setStartupError(toErrorMessage(error));
      } finally {
        setActivitiesLoaded(true);
      }
    })();

    logStartup('initializing exercise cache');
    setStartupStatus('Preparing exercise library');
    void Promise.resolve(initializeExercises())
      .then(() => {
        logStartup('exercise cache initialized');
      })
      .catch(error => {
        logStartupError('exercise cache initialization failed', error);
        setStartupError(toErrorMessage(error));
      });

    logStartup('initializing activity type cache');
    setStartupStatus('Preparing activity types');
    void Promise.resolve(initializeActivityTypes())
      .then(() => {
        logStartup('activity type cache initialized');
      })
      .catch(error => {
        logStartupError('activity type cache initialization failed', error);
        setStartupError(toErrorMessage(error));
      });

    (async () => {
      logStartup('loading tutorial completion state');
      setStartupStatus('Restoring tutorial state');
      try {
        const completed = await loadTutorialCompleted();
        setShouldShowTutorial(!completed);
        logStartup(`tutorial completion loaded: ${completed ? 'complete' : 'incomplete'}`);
      } catch (error) {
        logStartupError('failed to load tutorial completion state', error);
        setStartupError(toErrorMessage(error));
        setShouldShowTutorial(false);
      } finally {
        setTutorialReady(true);
      }
    })();
  }, [dispatch]);

  // Track when activities finish loading (from thunk state)
  useEffect(() => {
    if (!activitiesLoading && activitiesLoaded) {
      // Already handled by the promise above
    }
  }, [activitiesLoading, activitiesLoaded]);

  // Auth ready check
  const authReady = !isConfigured || !authLoading;

  useEffect(() => {
    if (!isConfigured) {
      setStartupStatus('Starting local app');
      return;
    }

    if (authLoading) {
      setStartupStatus('Checking sign-in');
      return;
    }

    if (!activitiesLoaded) {
      setStartupStatus('Loading saved workouts');
      return;
    }

    if (!syncComplete) {
      setStartupStatus(user ? 'Syncing workout data' : 'Preparing offline mode');
      return;
    }

    if (!tutorialReady) {
      setStartupStatus('Restoring tutorial state');
      return;
    }

    setStartupStatus('Ready');
  }, [
    activitiesLoaded,
    authLoading,
    isConfigured,
    syncComplete,
    tutorialReady,
    user,
  ]);

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
        Promise.all([fetchEquipment(token), fetchLibrary(token)]).catch(err =>
          console.error('Failed to sync user data:', err)
        );
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
            ).catch(err => console.error('Foreground sync failed:', err));
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

  return {
    isReady: isReady || startupTimedOut,
    shouldShowTutorial,
    startupStatus,
    startupError,
  };
}
