import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadThemeMode, saveThemeMode } from '../utils/storage';
import { getColors, ThemeColors } from './colors';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextProps {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  colorScheme: 'light' | 'dark';
  colors: ThemeColors;
}

export const ThemeContext = createContext<ThemeContextProps>({
  themeMode: 'light',
  setThemeMode: () => {},
  colorScheme: 'light',
  colors: getColors('light'),
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');

  // Load saved theme mode on app start
  useEffect(() => {
    const loadSavedTheme = async () => {
      const savedTheme = await loadThemeMode();
      // Only use saved theme if it's 'light' or 'dark', otherwise default to 'light'
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeMode(savedTheme as ThemeMode);
      }
    };
    loadSavedTheme();
  }, []);

  // Save theme mode when it changes
  const handleSetThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    saveThemeMode(mode);
  };

  const colors = getColors(themeMode);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        setThemeMode: handleSetThemeMode,
        colorScheme: themeMode,
        colors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
