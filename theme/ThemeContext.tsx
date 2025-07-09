import React, { createContext, useState, useEffect } from 'react';
import { saveThemeMode, loadThemeMode } from '../utils/storage';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextProps {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  colorScheme: 'light' | 'dark';
}

export const ThemeContext = createContext<ThemeContextProps>({
  themeMode: 'light',
  setThemeMode: () => {},
  colorScheme: 'light',
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

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        setThemeMode: handleSetThemeMode,
        colorScheme: themeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
