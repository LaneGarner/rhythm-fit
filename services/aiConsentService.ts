import AsyncStorage from '@react-native-async-storage/async-storage';

const AI_CONSENT_KEY_PREFIX = '@rhythm/ai-openai-consent:v1:';

export const AI_DATA_DISCLOSURE =
  'Rhythm sends your coach messages and relevant fitness information—including your goals, workout history, schedule, equipment, and any injury or health notes you choose to provide—to OpenAI to generate plans and replies. OpenAI processes this information on Rhythm’s behalf. You can change this choice later in Settings.';

function consentKey(userId: string): string {
  return `${AI_CONSENT_KEY_PREFIX}${userId}`;
}

export async function hasAIDataConsent(userId: string): Promise<boolean> {
  // New users default to sharing; an explicit opt-out stays off.
  return (await AsyncStorage.getItem(consentKey(userId))) !== 'denied';
}

export async function grantAIDataConsent(userId: string): Promise<void> {
  await AsyncStorage.setItem(consentKey(userId), 'granted');
}

export async function revokeAIDataConsent(userId: string): Promise<void> {
  await AsyncStorage.setItem(consentKey(userId), 'denied');
}
