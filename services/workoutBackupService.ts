import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  createWorkoutExport,
  ExportFormat,
  ExportRange,
  WorkoutBackupData,
} from '../utils/workoutExport';

// Explicit allowlist: never read authentication keys or another account's snapshot.
export async function readWorkoutBackup(
  userId?: string
): Promise<WorkoutBackupData> {
  const keys = ['activities', 'rhythm_pending_sync'];
  if (userId) keys.push(`rhythm_recovery_backup_v2:${userId}`);
  const values = new Map(await AsyncStorage.multiGet(keys));
  const read = (key: string, fallback: unknown) =>
    values.get(key) == null ? fallback : JSON.parse(values.get(key)!);
  const activities = read('activities', []),
    pending = read('rhythm_pending_sync', []);
  const preSyncSnapshot = userId
    ? read(`rhythm_recovery_backup_v2:${userId}`, null)
    : null;
  if (
    !Array.isArray(activities) ||
    !Array.isArray(pending) ||
    (preSyncSnapshot &&
      (typeof preSyncSnapshot !== 'object' ||
        Array.isArray(preSyncSnapshot) ||
        (preSyncSnapshot.activities &&
          !Array.isArray(preSyncSnapshot.activities)) ||
        (preSyncSnapshot.pending && !Array.isArray(preSyncSnapshot.pending))))
  )
    throw new Error('Workout storage could not be read. No data was changed.');
  return { accountId: userId || null, activities, pending, preSyncSnapshot };
}
export async function shareWorkoutExport(
  source: WorkoutBackupData,
  range: ExportRange,
  format: ExportFormat
): Promise<void> {
  if (!FileSystem.documentDirectory)
    throw new Error('Export storage is unavailable on this device.');
  if (!(await Sharing.isAvailableAsync()))
    throw new Error('File sharing is unavailable on this device.');
  const file = createWorkoutExport(source, range, format);
  const uri = `${FileSystem.documentDirectory}rhythm-workouts-${Date.now()}.${file.extension}`;
  await FileSystem.writeAsStringAsync(uri, file.contents);
  if ((await FileSystem.readAsStringAsync(uri)) !== file.contents)
    throw new Error('Export verification failed. Please try again.');
  await Sharing.shareAsync(uri, {
    mimeType: file.mimeType,
    UTI: file.uti,
    dialogTitle: 'Export workout data',
  });
}
export async function exportWorkoutBackup(userId?: string): Promise<void> {
  await shareWorkoutExport(
    await readWorkoutBackup(userId),
    { type: 'all' },
    'json'
  );
}
