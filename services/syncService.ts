import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Activity } from '../types/activity';

const API_URL =
  (Constants.expoConfig?.extra?.API_URL as string | undefined) ||
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  '';

const LAST_SYNC_KEY = 'rhythm_last_sync_time';
const PENDING_SYNC_KEY = 'rhythm_pending_sync';

interface SyncableActivity extends Activity {
  updated_at: string;
  deleted_at?: string;
}

interface SyncResponse {
  synced: number;
  conflicts: string[];
  serverActivities: SyncableActivity[];
  syncTime: string;
}

interface FetchResponse {
  activities: SyncableActivity[];
  syncTime: string;
}

// Get the last sync time from storage
async function getLastSyncTime(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

// Save the last sync time
async function setLastSyncTime(time: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SYNC_KEY, time);
  } catch (err) {
    console.error('Failed to save last sync time:', err);
  }
}

// Get pending activities that need to sync
async function getPendingActivities(): Promise<SyncableActivity[]> {
  try {
    const pending = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    return pending ? JSON.parse(pending) : [];
  } catch {
    return [];
  }
}

// Add an activity to the pending sync queue
export async function addToPendingSync(
  activity: SyncableActivity
): Promise<void> {
  try {
    const pending = await getPendingActivities();
    // Replace existing or add new
    const index = pending.findIndex(a => a.id === activity.id);
    if (index >= 0) {
      pending[index] = activity;
    } else {
      pending.push(activity);
    }
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
  } catch (err) {
    console.error('Failed to add to pending sync:', err);
  }
}

// Clear pending sync queue
async function clearPendingSync(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_SYNC_KEY);
  } catch (err) {
    console.error('Failed to clear pending sync:', err);
  }
}

// Merge local and server activities
// Strategy: server wins if updated_at is newer
function mergeActivities(
  localActivities: Activity[],
  serverActivities: SyncableActivity[]
): Activity[] {
  const merged = new Map<string, Activity>();

  // Add all local activities
  for (const activity of localActivities) {
    merged.set(activity.id, activity);
  }

  // Merge server activities (server wins if newer)
  for (const serverActivity of serverActivities) {
    // Skip deleted activities
    if (serverActivity.deleted_at) {
      merged.delete(serverActivity.id);
      continue;
    }

    const local = merged.get(serverActivity.id);
    if (!local) {
      // New from server
      merged.set(serverActivity.id, serverActivity);
    } else {
      // Compare timestamps
      const localTime = (local as SyncableActivity).updated_at
        ? new Date((local as SyncableActivity).updated_at).getTime()
        : 0;
      const serverTime = new Date(serverActivity.updated_at).getTime();

      if (serverTime > localTime) {
        merged.set(serverActivity.id, serverActivity);
      }
    }
  }

  return Array.from(merged.values());
}

// Main sync function - call this on app open (after login)
export async function syncActivities(
  accessToken: string,
  localActivities: Activity[],
  onActivitiesUpdated: (activities: Activity[]) => void
): Promise<void> {
  if (!API_URL) {
    return;
  }

  try {
    const lastSyncTime = await getLastSyncTime();
    const pendingActivities = await getPendingActivities();

    // 1. Fetch server activities updated since last sync
    let serverActivities: SyncableActivity[] = [];
    let fetchSyncTime: string | null = null;
    try {
      const url = lastSyncTime
        ? `${API_URL}/api/activities?since=${encodeURIComponent(lastSyncTime)}`
        : `${API_URL}/api/activities`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data: FetchResponse = await response.json();
        serverActivities = data.activities;
        fetchSyncTime = data.syncTime;
      }
    } catch (err) {
      console.error('Failed to fetch server activities:', err);
    }

    // 2. Merge local and server activities
    const merged = mergeActivities(localActivities, serverActivities);

    // 3. Update Redux + AsyncStorage with merged data
    onActivitiesUpdated(merged);

    // 4. Push pending local changes to server
    if (pendingActivities.length > 0) {
      try {
        const response = await fetch(`${API_URL}/api/activities`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            activities: pendingActivities,
            lastSyncTime,
          }),
        });

        if (response.ok) {
          const data: SyncResponse = await response.json();

          // If there are newer server activities, merge them too
          if (data.serverActivities?.length > 0) {
            const finalMerged = mergeActivities(merged, data.serverActivities);
            onActivitiesUpdated(finalMerged);
          }

          // Clear pending queue on success
          await clearPendingSync();
          await setLastSyncTime(data.syncTime);
        }
      } catch (err) {
        console.error('Failed to push activities to server:', err);
        // Keep pending queue for next sync
      }
    } else if (fetchSyncTime) {
      // Use server-provided sync time to avoid client/server clock drift
      await setLastSyncTime(fetchSyncTime);
    }
  } catch (err) {
    console.error('Sync failed:', err);
  }
}

// Push a single activity change immediately (call after mutations)
export async function pushActivityChange(
  accessToken: string,
  activity: Activity,
  deleted: boolean = false
): Promise<void> {
  if (!API_URL) {
    return;
  }

  const syncableActivity: SyncableActivity = {
    ...activity,
    updated_at: new Date().toISOString(),
    deleted_at: deleted ? new Date().toISOString() : undefined,
  };

  // Always add to pending queue first (for offline support)
  await addToPendingSync(syncableActivity);

  // Try to push immediately
  try {
    const response = await fetch(`${API_URL}/api/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        activities: [syncableActivity],
      }),
    });

    if (response.ok) {
      // Remove from pending queue on success
      const pending = await getPendingActivities();
      const filtered = pending.filter(a => a.id !== activity.id);
      await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(filtered));

      const data: SyncResponse = await response.json();
      await setLastSyncTime(data.syncTime);
    }
  } catch (err) {
    console.error('Failed to push activity change:', err);
    // Activity stays in pending queue for next sync
  }
}

// Clear all sync data (call on logout)
export async function clearSyncData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([LAST_SYNC_KEY, PENDING_SYNC_KEY]);
  } catch (err) {
    console.error('Failed to clear sync data:', err);
  }
}
