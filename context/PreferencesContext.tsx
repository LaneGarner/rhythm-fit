import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { WeekStartDay, DEFAULT_PREFERENCES } from '../types/preferences';
import {
  loadFirstDayOfWeek,
  saveFirstDayOfWeek,
  loadAutoRestTimer,
  saveAutoRestTimer,
  loadTimerVibration,
  saveTimerVibration,
  loadTimerSound,
  saveTimerSound,
} from '../utils/storage';
import { useAuth } from './AuthContext';
import { isBackendConfigured } from '../config/api';
import {
  fetchPreferences,
  updatePreferences,
} from '../services/preferencesService';

interface PreferencesContextProps {
  firstDayOfWeek: WeekStartDay;
  setFirstDayOfWeek: (day: WeekStartDay) => void;
  autoRestTimer: boolean;
  setAutoRestTimer: (enabled: boolean) => void;
  timerVibration: boolean;
  setTimerVibration: (enabled: boolean) => void;
  timerSound: boolean;
  setTimerSound: (enabled: boolean) => void;
  isLoading: boolean;
}

export const PreferencesContext = createContext<PreferencesContextProps>({
  firstDayOfWeek: DEFAULT_PREFERENCES.firstDayOfWeek,
  setFirstDayOfWeek: () => {},
  autoRestTimer: false,
  setAutoRestTimer: () => {},
  timerVibration: true,
  setTimerVibration: () => {},
  timerSound: true,
  setTimerSound: () => {},
  isLoading: true,
});

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firstDayOfWeek, setFirstDayOfWeekState] = useState<WeekStartDay>(
    DEFAULT_PREFERENCES.firstDayOfWeek
  );
  const [autoRestTimer, setAutoRestTimerState] = useState(false);
  const [timerVibration, setTimerVibrationState] = useState(true);
  const [timerSound, setTimerSoundState] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const { user, getAccessToken, isLoading: authLoading } = useAuth();

  const isAuthenticated = Boolean(user) && isBackendConfigured();

  // Load preferences on mount and when auth state changes
  useEffect(() => {
    const loadPreferences = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      setIsLoading(true);

      // First, load from local storage (immediate)
      const localPref = await loadFirstDayOfWeek();
      setFirstDayOfWeekState(localPref);

      const localAutoRest = await loadAutoRestTimer();
      setAutoRestTimerState(localAutoRest);

      const localTimerVibration = await loadTimerVibration();
      setTimerVibrationState(localTimerVibration);

      const localTimerSound = await loadTimerSound();
      setTimerSoundState(localTimerSound);

      // If authenticated, try to fetch from server
      if (isAuthenticated) {
        const token = getAccessToken();
        if (token) {
          const serverPrefs = await fetchPreferences(token);
          if (serverPrefs) {
            // Server preference takes precedence
            setFirstDayOfWeekState(serverPrefs.firstDayOfWeek);
            // Also update local storage to keep in sync
            await saveFirstDayOfWeek(serverPrefs.firstDayOfWeek);
          } else {
            // Server has no preference, push local to server
            await updatePreferences(token, localPref);
          }
        }
      }

      setIsLoading(false);
    };

    loadPreferences();
  }, [isAuthenticated, authLoading, getAccessToken]);

  // Handle setting the preference (save locally + sync to server)
  const handleSetFirstDayOfWeek = useCallback(
    async (day: WeekStartDay) => {
      // Update state immediately
      setFirstDayOfWeekState(day);

      // Save to local storage
      await saveFirstDayOfWeek(day);

      // Sync to server if authenticated
      if (isAuthenticated) {
        const token = getAccessToken();
        if (token) {
          await updatePreferences(token, day);
        }
      }
    },
    [isAuthenticated, getAccessToken]
  );

  const handleSetAutoRestTimer = useCallback(async (enabled: boolean) => {
    setAutoRestTimerState(enabled);
    await saveAutoRestTimer(enabled);
  }, []);

  const handleSetTimerVibration = useCallback(async (enabled: boolean) => {
    setTimerVibrationState(enabled);
    await saveTimerVibration(enabled);
  }, []);

  const handleSetTimerSound = useCallback(async (enabled: boolean) => {
    setTimerSoundState(enabled);
    await saveTimerSound(enabled);
  }, []);

  return (
    <PreferencesContext.Provider
      value={{
        firstDayOfWeek,
        setFirstDayOfWeek: handleSetFirstDayOfWeek,
        autoRestTimer,
        setAutoRestTimer: handleSetAutoRestTimer,
        timerVibration,
        setTimerVibration: handleSetTimerVibration,
        timerSound,
        setTimerSound: handleSetTimerSound,
        isLoading,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => useContext(PreferencesContext);
