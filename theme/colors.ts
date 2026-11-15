// Raw color palette - internal use only
export const palette = {
  blue: {
    100: '#dbeafe',
    200: '#93c5fd',
    300: '#87B2ED',
    400: '#386DB5',
    500: '#244B88',
    600: '#1e40af',
    700: '#1e3a5f',
  },
  green: {
    300: '#7DBF94',
    400: '#378353',
    500: '#285C40',
  },
  red: {
    300: '#FF6347',
    400: '#B83C2A',
    500: '#993122',
    700: '#56291F',
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
    foreground: string;
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
    foreground: string;
    dark: string;
  };
  error: {
    main: string;
    foreground: string;
    dark: string;
    background: string;
  };
  warning: {
    main: string;
    foreground: string;
    dark: string;
    background: string;
    mutedBackground: string;
  };

  // UI elements
  tabBarActive: string;
  tabBarInactive: string;
  toggleTrack: string;
  inputBackground: string;
  inputBorder: string;
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
  textSecondary: '#535C69',
  textTertiary: '#656C79',
  textInverse: palette.white,

  // Borders
  border: palette.gray[200],
  borderSecondary: palette.gray[100],

  // Primary
  primary: {
    main: palette.blue[400],
    foreground: palette.blue[400],
    light: palette.blue[300],
    dark: palette.blue[500],
    background: '#f4f4f5',
  },

  // Secondary (used for accents like supersets)
  secondary: {
    main: palette.blue[400],
    light: palette.blue[300],
  },

  // Accent (for highlighting "today" and other attention-drawing elements)
  accent: {
    main: palette.blue[400],
    background: '#f4f4f5',
  },

  // Semantic
  success: {
    main: palette.green[400],
    foreground: palette.green[400],
    dark: palette.green[500],
  },
  error: {
    main: palette.red[400],
    foreground: palette.red[400],
    dark: palette.red[500],
    background: '#FBE8E3',
  },
  warning: {
    main: palette.amber[400],
    dark: palette.amber[600],
    background: palette.amber[100],
    foreground: '#805107',
    mutedBackground: '#F1E8CF',
  },

  // UI elements
  tabBarActive: palette.blue[400],
  tabBarInactive: palette.ios.gray,
  toggleTrack: palette.gray[200],
  inputBackground: palette.white,
  inputBorder: '#85858D',
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
  textSecondary: '#B2B4BC',
  textTertiary: '#ADADB7',
  textInverse: palette.black,

  // Borders
  border: palette.zinc[700],
  borderSecondary: palette.zinc[600],

  // Primary
  primary: {
    main: palette.blue[400],
    foreground: palette.blue[300],
    light: palette.blue[300],
    dark: palette.blue[500],
    background: palette.zinc[700],
  },

  // Secondary (used for accents like supersets)
  secondary: {
    main: palette.blue[400],
    light: palette.blue[300],
  },

  // Accent (for highlighting "today" and other attention-drawing elements)
  accent: {
    main: palette.blue[400],
    background: palette.zinc[800],
  },

  // Semantic
  success: {
    main: palette.green[400],
    foreground: palette.green[300],
    dark: palette.green[500],
  },
  error: {
    main: palette.red[400],
    foreground: palette.red[300],
    dark: palette.red[500],
    background: palette.red[700],
  },
  warning: {
    main: palette.amber[400],
    dark: palette.amber[600],
    background: palette.amber[800],
    foreground: palette.amber[400],
    mutedBackground: '#4C4029',
  },

  // UI elements
  tabBarActive: palette.blue[300],
  tabBarInactive: palette.ios.gray,
  toggleTrack: palette.zinc[600],
  inputBackground: palette.zinc[700],
  inputBorder: '#96969F',
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
