import Constants from 'expo-constants';

export const OPENAI_CONFIG = {
  apiKey: Constants.expoConfig?.extra?.OPENAI_API_KEY || '',
};
