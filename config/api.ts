import Constants from 'expo-constants';

export const OPENAI_CONFIG = {
  apiKey:
    (Constants.expoConfig?.extra?.OPENAI_API_KEY as string | undefined) ||
    (process.env.EXPO_PUBLIC_OPENAI_API_KEY as string | undefined) ||
    '',
  dangerouslyAllowBrowser: true,
};
