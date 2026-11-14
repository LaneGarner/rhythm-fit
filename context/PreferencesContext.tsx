import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_PREFERENCES,
  NotificationSettings,
  WeekStartDay,
} from '../types/preferences';
import {
  loadFirstDayOfWeek,
  saveFirstDayOfWeek,
  loadAutoRestTimer,
  saveAutoRestTimer,
  loadTimerVibration,
  saveTimerVibration,
  loadTimerSound,
  saveTimerSound,
  loadLiveActivity,
  saveLiveActivity,
  loadNotificationSettings,
  saveNotificationSettings,
} from '../utils/storage';
import { useAuth } from './AuthContext';
import { isBackendConfigured } from '../config/api';
import {
  fetchPreferences,
  updatePreferences,
} from '../services/preferencesService';

const ROGUE_TIMER_KEY = 'rhythm.rogueTimerEnabled';

interface PreferencesContextProps {
  firstDayOfWeek: WeekStartDay;
  setFirstDayOfWeek: (day: WeekStartDay) => void;
  autoRestTimer: boolean;
  setAutoRestTimer: (enabled: boolean) => void;
  timerVibration: boolean;
  setTimerVibration: (enabled: boolean) => void;
  rogueTimerEnabled: boolean;
  setRogueTimerEnabled: (enabled: boolean) => void;
  timerSound: boolean;
  setTimerSound: (enabled: boolean) => void;
  liveActivity: boolean;
  setLiveActivity: (enabled: boolean) => void;
  notificationSettings: NotificationSettings;
  setNotificationSettings: (settings: NotificationSettings) => void;
  isLoading: boolean;
}

export const PreferencesContext = createContext<PreferencesContextProps>({
  firstDayOfWeek: DEFAULT_PREFERENCES.firstDayOfWeek,
  setFirstDayOfWeek: () => {},
  autoRestTimer: false,
  setAutoRestTimer: () => {},
  timerVibration: true,
  setTimerVibration: () => {},
  rogueTimerEnabled: false,
  setRogueTimerEnabled: () => {},
  timerSound: true,
  setTimerSound: () => {},
  liveActivity: true,
  setLiveActivity: () => {},
  notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
  setNotificationSettings: () => {},
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
  const [rogueTimerEnabled, setRogueTimerState] = useState(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(ROGUE_TIMER_KEY)
      .then(value => {
        if (active) setRogueTimerState(value === 'true');
      })
      .catch(console.warn);
    return () => {
      active = false;
    };
  }, []);

  const setRogueTimerEnabled = useCallback((enabled: boolean) => {
    setRogueTimerState(enabled);
    AsyncStorage.setItem(ROGUE_TIMER_KEY, String(enabled)).catch(console.warn);
  }, []);
  const [timerSound, setTimerSoundState] = useState(true);
  const [liveActivity, setLiveActivityState] = useState(true);
  const [notificationSettings, setNotificationSettingsState] =
    useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const { user, getAccessToken, isLoading: authLoading } = useAuth();

  const isAuthenticated = Boolean(user) && isBackendConfigured();

  // Load preferences on mount and when auth state changes
  useEffect(() => {
    const loadPreferences = async () => {
      if (authLoading) {
        return;
      }

      setIsLoading(true);

      const localPref = await loadFirstDayOfWeek();
      setFirstDayOfWeekState(localPref);

      const localAutoRest = await loadAutoRestTimer();
      setAutoRestTimerState(localAutoRest);

      const localTimerVibration = await loadTimerVibration();
      setTimerVibrationState(localTimerVibration);

      const localTimerSound = await loadTimerSound();
      setTimerSoundState(localTimerSound);

      const localLiveActivity = await loadLiveActivity();
      setLiveActivityState(localLiveActivity);

      const localNotifications = await loadNotificationSettings();
      setNotificationSettingsState(localNotifications);

      if (isAuthenticated) {
        const token = getAccessToken();
        if (token) {
          const serverPrefs = await fetchPreferences(token);
          if (serverPrefs) {
            setFirstDayOfWeekState(serverPrefs.firstDayOfWeek);
            setNotificationSettingsState(serverPrefs.notificationSettings);
            await saveFirstDayOfWeek(serverPrefs.firstDayOfWeek);
            await saveNotificationSettings(serverPrefs.notificationSettings);
          } else {
            await updatePreferences(token, {
              firstDayOfWeek: localPref,
              notificationSettings: localNotifications,
            });
          }
        }
      }

      setIsLoading(false);
    };

    loadPreferences();
  }, [isAuthenticated, authLoading, getAccessToken]);

  const handleSetFirstDayOfWeek = useCallback(
    async (day: WeekStartDay) => {
      setFirstDayOfWeekState(day);
      await saveFirstDayOfWeek(day);

      if (isAuthenticated) {
        const token = getAccessToken();
        if (token) {
          await updatePreferences(token, { firstDayOfWeek: day });
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

  const handleSetLiveActivity = useCallback(async (enabled: boolean) => {
    setLiveActivityState(enabled);
    await saveLiveActivity(enabled);
  }, []);

  const handleSetNotificationSettings = useCallback(
    async (settings: NotificationSettings) => {
      setNotificationSettingsState(settings);
      await saveNotificationSettings(settings);

      if (isAuthenticated) {
        const token = getAccessToken();
        if (token) {
          await updatePreferences(token, { notificationSettings: settings });
        }
      }
    },
    [isAuthenticated, getAccessToken]
  );

  return (
    <PreferencesContext.Provider
      value={{
        firstDayOfWeek,
        setFirstDayOfWeek: handleSetFirstDayOfWeek,
        autoRestTimer,
        setAutoRestTimer: handleSetAutoRestTimer,
        timerVibration,
        setTimerVibration: handleSetTimerVibration,
        rogueTimerEnabled,
        setRogueTimerEnabled,
        timerSound,
        setTimerSound: handleSetTimerSound,
        liveActivity,
        setLiveActivity: handleSetLiveActivity,
        notificationSettings,
        setNotificationSettings: handleSetNotificationSettings,
        isLoading,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => useContext(PreferencesContext);
