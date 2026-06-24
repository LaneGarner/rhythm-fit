import 'dotenv/config';

export default {
  expo: {
    name: 'Rhythm Fit',
    description: 'AI-Powered Workout Tracker & Coach',
    slug: 'rhythm',
    scheme: 'rhythm',
    version: '1.0.0',
    orientation: 'default',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    ios: {
      bundleIdentifier: 'com.yourname.rhythm',
      supportsTablet: true,
      requireFullScreen: false,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        UIBackgroundModes: ['remote-notification'],
      },
    },
    android: {
      package: 'com.yourname.rhythm',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#000000',
      },
      edgeToEdgeEnabled: true,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-audio',
      'react-native-bottom-tabs',
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#000000',
        },
      ],
      [
        'expo-build-properties',
        {
          ios: {
            deploymentTarget: '16.1',
          },
        },
      ],
    ],
    autolinking: {
      exclude: ['live-activity'],
    },
    extra: {
      API_URL: process.env.EXPO_PUBLIC_API_URL || '',
      SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
      SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      eas: {
        projectId: 'ec09ca85-b109-41d4-bb48-b4caadaea1a6',
      },
    },
  },
};
