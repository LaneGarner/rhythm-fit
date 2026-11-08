import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// Only workout data is exported. Never include auth/session storage keys.
export async function exportWorkoutBackup(userId?: string): Promise<void> {
  if (!FileSystem.documentDirectory)
    throw new Error('Backup storage is unavailable on this device.');
  if (!(await Sharing.isAvailableAsync()))
    throw new Error('File sharing is unavailable on this device.');
  const keys = ['activities', 'rhythm_pending_sync'];
  if (userId) keys.push(`rhythm_recovery_backup_v2:${userId}`);
  const values = new Map(await AsyncStorage.multiGet(keys));
  const read = (key: string, fallback: unknown) => {
    const value = values.get(key);
    return value == null ? fallback : JSON.parse(value);
  };
  const activities = read('activities', []);
  const pending = read('rhythm_pending_sync', []);
  if (!Array.isArray(activities) || !Array.isArray(pending))
    throw new Error('Workout storage could not be read. No data was changed.');
  const backup = {
    format: 'rhythm-workout-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    accountId: userId || null,
    activities,
    pending,
    preSyncSnapshot: userId
      ? read(`rhythm_recovery_backup_v2:${userId}`, null)
      : null,
  };
  const uri = `${FileSystem.documentDirectory}rhythm-workouts-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(backup, null, 2));
  // Verify the saved file before opening the share sheet. Keep it even if
  // sharing is cancelled, so recovery never depends on the share outcome.
  const saved = await FileSystem.readAsStringAsync(uri);
  if (saved !== JSON.stringify(backup, null, 2))
    throw new Error('Backup verification failed. Please try again.');
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Save workout backup',
  });
}
