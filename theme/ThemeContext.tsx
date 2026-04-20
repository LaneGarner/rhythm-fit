import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { loadThemeMode, saveThemeMode } from '../utils/storage';
import { getColors, ThemeColors } from './colors';

export type ThemeMode = 'light' | 'dark';
export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextProps {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  /** @deprecated Use themePreference and setThemePreference instead */
  themeMode: ThemeMode;
  /** @deprecated Use setThemePreference instead */
  setThemeMode: (mode: ThemeMode) => void;
  colorScheme: 'light' | 'dark';
  colors: ThemeColors;
}

export const ThemeContext = createContext<ThemeContextProps>({
  themePreference: 'system',
  setThemePreference: () => {},
  themeMode: 'light',
  setThemeMode: () => {},
  colorScheme: 'light',
  colors: getColors('light'),
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [themePreference, setThemePreference] =
    useState<ThemePreference>('system');
  const systemColorScheme = useColorScheme();

  const resolvedColorScheme: 'light' | 'dark' =
    themePreference === 'system'
      ? (systemColorScheme ?? 'light')
      : themePreference;

  // Load saved theme preference on app start
  useEffect(() => {
    const loadSavedTheme = async () => {
      const saved = await loadThemeMode();
      if (saved === 'system' || saved === 'light' || saved === 'dark') {
        setThemePreference(saved as ThemePreference);
      }
    };
    loadSavedTheme();
  }, []);

  const handleSetThemePreference = (pref: ThemePreference) => {
    setThemePreference(pref);
    saveThemeMode(pref);
  };

  // Backward compat wrapper
  const handleSetThemeMode = (mode: ThemeMode) => {
    handleSetThemePreference(mode);
  };

  const colors = getColors(resolvedColorScheme);

  return (
    <ThemeContext.Provider
      value={{
        themePreference,
        setThemePreference: handleSetThemePreference,
        themeMode: resolvedColorScheme,
        setThemeMode: handleSetThemeMode,
        colorScheme: resolvedColorScheme,
        colors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
