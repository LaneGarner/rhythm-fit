// Raw color palette - internal use only
export const palette = {
  blue: {
    100: '#dbeafe',
    200: '#93c5fd',
    300: '#60a5fa',
    400: '#3b82f6',
    500: '#2563eb',
    600: '#1e40af',
    700: '#1e3a5f',
  },
  green: {
    300: '#34d399',
    400: '#22c55e',
    500: '#16a34a',
  },
  red: {
    300: '#f87171',
    400: '#ef4444',
    500: '#dc2626',
    700: '#991b1b',
  },
  amber: {
    100: '#fef3c7',
    300: '#fbbf24',
    400: '#eab308',
    600: '#92400e',
    800: '#422006',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
  },
  zinc: {
    400: '#a3a3a3',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    850: '#1c1c1e',
    900: '#18181b',
  },
  white: '#ffffff',
  black: '#000000',
  ios: {
    blue: '#007aff',
    orange: '#ff9500',
    gray: '#8e8e93',
  },
};

// Theme colors interface
export interface ThemeColors {
  // Backgrounds
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  surface: string;
  surfaceSecondary: string;

  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Borders
  border: string;
  borderSecondary: string;

  // Primary
  primary: {
    main: string;
    light: string;
    dark: string;
    background: string;
  };

  // Secondary/accent
  secondary: {
    main: string;
    light: string;
  };

  // Accent (for highlighting "today" and other attention-drawing elements)
  accent: {
    main: string;
    background: string;
  };

  // Semantic
  success: {
    main: string;
    dark: string;
  };
  error: {
    main: string;
    dark: string;
    background: string;
  };
  warning: {
    main: string;
    dark: string;
    background: string;
  };

  // UI elements
  tabBarActive: string;
  tabBarInactive: string;
  toggleTrack: string;
  inputBackground: string;
  cardBackground: string;
  modalBackground: string;
  overlay: string;
}

// Light theme colors
export const lightColors: ThemeColors = {
  // Backgrounds
  background: palette.gray[50],
  backgroundSecondary: palette.gray[100],
  backgroundTertiary: palette.gray[200],
  surface: palette.white,
  surfaceSecondary: palette.gray[100],

  // Text
  text: palette.black,
  textSecondary: palette.gray[500],
  textTertiary: palette.gray[400],
  textInverse: palette.white,

  // Borders
  border: palette.gray[200],
  borderSecondary: palette.gray[100],

  // Primary
  primary: {
    main: palette.ios.blue,
    light: '#4da3ff',
    dark: '#0055b3',
    background: '#e6f3ff',
  },

  // Secondary (used for accents like supersets)
  secondary: {
    main: palette.blue[400],
    light: palette.blue[300],
  },

  // Accent (for highlighting "today" and other attention-drawing elements)
  accent: {
    main: '#3b82f6',
    background: '#eff6ff',
  },

  // Semantic
  success: {
    main: palette.green[400],
    dark: palette.green[500],
  },
  error: {
    main: palette.red[400],
    dark: palette.red[500],
    background: palette.red[300],
  },
  warning: {
    main: palette.amber[400],
    dark: palette.amber[600],
    background: palette.amber[100],
  },

  // UI elements
  tabBarActive: palette.ios.blue,
  tabBarInactive: palette.ios.gray,
  toggleTrack: palette.gray[200],
  inputBackground: palette.white,
  cardBackground: palette.white,
  modalBackground: palette.white,
  overlay: 'rgba(0, 0, 0, 0.5)',
};

// Dark theme colors
export const darkColors: ThemeColors = {
  // Backgrounds
  background: palette.zinc[900],
  backgroundSecondary: palette.zinc[850],
  backgroundTertiary: palette.zinc[800],
  surface: palette.zinc[800],
  surfaceSecondary: palette.zinc[700],

  // Text
  text: palette.white,
  textSecondary: palette.gray[400],
  textTertiary: palette.zinc[500],
  textInverse: palette.black,

  // Borders
  border: palette.zinc[700],
  borderSecondary: palette.zinc[600],

  // Primary
  primary: {
    main: palette.ios.blue,
    light: '#4da3ff',
    dark: '#0055b3',
    background: '#002952',
  },

  // Secondary (used for accents like supersets)
  secondary: {
    main: palette.blue[400],
    light: palette.blue[300],
  },

  // Accent (for highlighting "today" and other attention-drawing elements)
  accent: {
    main: '#3b82f6',
    background: '#1F2233',
  },

  // Semantic
  success: {
    main: palette.green[400],
    dark: palette.green[500],
  },
  error: {
    main: palette.red[400],
    dark: palette.red[500],
    background: palette.red[700],
  },
  warning: {
    main: palette.amber[400],
    dark: palette.amber[600],
    background: palette.amber[800],
  },

  // UI elements
  tabBarActive: palette.ios.blue,
  tabBarInactive: palette.ios.gray,
  toggleTrack: palette.zinc[600],
  inputBackground: palette.zinc[700],
  cardBackground: palette.zinc[800],
  modalBackground: palette.zinc[850],
  overlay: 'rgba(0, 0, 0, 0.7)',
};

// Get colors based on color scheme
export function getColors(colorScheme: 'light' | 'dark'): ThemeColors {
  return colorScheme === 'dark' ? darkColors : lightColors;
}

// Gradient definitions
export const gradients = {
  primary: {
    light: [palette.blue[400], palette.blue[500]],
    dark: [palette.blue[300], palette.blue[400]],
  },
  success: {
    light: [palette.green[400], palette.green[500]],
    dark: [palette.green[300], palette.green[400]],
  },
};
