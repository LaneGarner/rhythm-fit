import React, { createContext, useContext, useEffect, useState } from 'react';
import { WeekStartDay, DEFAULT_PREFERENCES } from '../types/preferences';
import { loadFirstDayOfWeek, saveFirstDayOfWeek } from '../utils/storage';

interface PreferencesContextProps {
  firstDayOfWeek: WeekStartDay;
  setFirstDayOfWeek: (day: WeekStartDay) => void;
}

export const PreferencesContext = createContext<PreferencesContextProps>({
  firstDayOfWeek: DEFAULT_PREFERENCES.firstDayOfWeek,
  setFirstDayOfWeek: () => {},
});

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firstDayOfWeek, setFirstDayOfWeekState] = useState<WeekStartDay>(
    DEFAULT_PREFERENCES.firstDayOfWeek
  );

  // Load saved preference on app start
  useEffect(() => {
    const loadSavedPreferences = async () => {
      const savedDay = await loadFirstDayOfWeek();
      setFirstDayOfWeekState(savedDay);
    };
    loadSavedPreferences();
  }, []);

  // Save preference when it changes
  const handleSetFirstDayOfWeek = (day: WeekStartDay) => {
    setFirstDayOfWeekState(day);
    saveFirstDayOfWeek(day);
  };

  return (
    <PreferencesContext.Provider
      value={{
        firstDayOfWeek,
        setFirstDayOfWeek: handleSetFirstDayOfWeek,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => useContext(PreferencesContext);
