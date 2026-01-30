import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { WeekStartDay, DEFAULT_PREFERENCES } from '../types/preferences';
import { loadFirstDayOfWeek, saveFirstDayOfWeek } from '../utils/storage';
import { useAuth } from './AuthContext';
import { isBackendConfigured } from '../config/api';
import {
  fetchPreferences,
  updatePreferences,
} from '../services/preferencesService';

interface PreferencesContextProps {
  firstDayOfWeek: WeekStartDay;
  setFirstDayOfWeek: (day: WeekStartDay) => void;
  isLoading: boolean;
}

export const PreferencesContext = createContext<PreferencesContextProps>({
  firstDayOfWeek: DEFAULT_PREFERENCES.firstDayOfWeek,
  setFirstDayOfWeek: () => {},
  isLoading: true,
});

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firstDayOfWeek, setFirstDayOfWeekState] = useState<WeekStartDay>(
    DEFAULT_PREFERENCES.firstDayOfWeek
  );
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

  return (
    <PreferencesContext.Provider
      value={{
        firstDayOfWeek,
        setFirstDayOfWeek: handleSetFirstDayOfWeek,
        isLoading,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => useContext(PreferencesContext);
