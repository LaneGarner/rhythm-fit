import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { API_URL } from '../config/api';
import { getPermissionStatus } from './notifications';

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    // Simulator / emulator won't produce a real token.
    return null;
  }

  const status = await getPermissionStatus();
  if (status !== 'granted') {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId;

  if (!projectId) {
    console.warn('No EAS projectId configured — cannot get push token.');
    return null;
  }

  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenResult.data;
  } catch (err) {
    console.error('Failed to get Expo push token:', err);
    return null;
  }
}

export async function registerAndSavePushToken(
  accessToken: string
): Promise<boolean> {
  if (!API_URL) return false;

  const expoPushToken = await registerForPushNotifications();
  if (!expoPushToken) return false;

  try {
    const response = await fetch(`${API_URL}/api/push-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        expo_push_token: expoPushToken,
        platform: Platform.OS,
      }),
    });
    return response.ok;
  } catch (err) {
    console.error('Failed to save push token to backend:', err);
    return false;
  }
}

export async function unregisterPushToken(
  accessToken: string
): Promise<boolean> {
  if (!API_URL) return false;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId;
  if (!projectId) return false;

  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const response = await fetch(`${API_URL}/api/push-tokens`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ expo_push_token: tokenResult.data }),
    });
    return response.ok;
  } catch (err) {
    console.error('Failed to unregister push token:', err);
    return false;
  }
}
