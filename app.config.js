import 'dotenv/config';

export default {
  expo: {
    name: 'Rhythm - AI Fitness Coach',
    slug: 'rhythm',
    version: '1.0.0',
    orientation: 'portrait',
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
      requireFullScreen: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.yourname.rhythm',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#000000',
      },
      edgeToEdgeEnabled: true,
      screenOrientation: 'portrait',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      OPENAI_API_KEY:
        process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      eas: {
        projectId: 'ec09ca85-b109-41d4-bb48-b4caadaea1a6',
      },
    },
  },
};
