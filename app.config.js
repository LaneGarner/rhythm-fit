import 'dotenv/config';

export default {
  expo: {
    name: 'Rhythm - AI Fitness Coach',
    slug: 'rhythm',
    ios: {
      bundleIdentifier: 'com.yourname.rhythm', // replace with your actual identifier
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.yourname.rhythm', // replace with your actual package name
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
