import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, getApiEndpoint } from '../config/api';
import { Activity } from '../types/activity';

const LAST_SYNC_KEY = 'rhythm_last_sync_time';
const PENDING_SYNC_KEY = 'rhythm_pending_sync';
const PENDING_SYNC_BACKFILL_KEY = 'rhythm_pending_sync_backfill_v1';

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

interface PendingPushResult {
  attempted: boolean;
  ok: boolean;
  data?: SyncResponse;
}

// AsyncStorage does not provide an atomic read-modify-write operation. Activity
// actions can arrive in quick bursts (especially when the Coach schedules a
// plan), so serialize queue access to prevent one enqueue from overwriting
// another.
let pendingQueueLock: Promise<void> = Promise.resolve();
let activePendingPush: Promise<PendingPushResult> | null = null;

async function withPendingQueueLock<T>(
  operation: () => Promise<T>
): Promise<T> {
  const previousOperation = pendingQueueLock;
  let releaseLock: () => void = () => {};
  pendingQueueLock = new Promise<void>(resolve => {
    releaseLock = resolve;
  });

  await previousOperation;
  try {
    return await operation();
  } finally {
    releaseLock();
  }
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
async function readPendingActivities(): Promise<SyncableActivity[]> {
  try {
    const pending = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    return pending ? JSON.parse(pending) : [];
  } catch {
    return [];
  }
}

async function getPendingActivities(): Promise<SyncableActivity[]> {
  return withPendingQueueLock(readPendingActivities);
}

async function backfillPendingActivities(
  localActivities: Activity[]
): Promise<void> {
  await withPendingQueueLock(async () => {
    const alreadyBackfilled = await AsyncStorage.getItem(
      PENDING_SYNC_BACKFILL_KEY
    );
    if (alreadyBackfilled) return;

    const pendingActivities = await readPendingActivities();
    const pendingById = new Map(
      pendingActivities.map(activity => [activity.id, activity])
    );

    for (const activity of localActivities) {
      const updatedAt = (activity as SyncableActivity).updated_at;
      if (!updatedAt) continue;

      const syncableActivity: SyncableActivity = {
        ...activity,
        updated_at: updatedAt,
      };
      const existingPending = pendingById.get(activity.id);
      if (
        !existingPending ||
        new Date(syncableActivity.updated_at).getTime() >
          new Date(existingPending.updated_at).getTime()
      ) {
        pendingById.set(activity.id, syncableActivity);
      }
    }

    await AsyncStorage.setItem(
      PENDING_SYNC_KEY,
      JSON.stringify(Array.from(pendingById.values()))
    );
    await AsyncStorage.setItem(PENDING_SYNC_BACKFILL_KEY, 'complete');
  });
}

// Add an activity to the pending sync queue
export async function addToPendingSync(
  activity: SyncableActivity
): Promise<void> {
  try {
    await withPendingQueueLock(async () => {
      const pending = await readPendingActivities();
      // Replace existing or add new
      const index = pending.findIndex(a => a.id === activity.id);
      if (index >= 0) {
        pending[index] = activity;
      } else {
        pending.push(activity);
      }
      await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
    });
  } catch (err) {
    console.error('Failed to add to pending sync:', err);
  }
}

async function removePendingSync(
  acknowledgedActivities: SyncableActivity[]
): Promise<void> {
  try {
    // Remove only the exact versions sent. If an activity was edited while the
    // request was in flight, its newer queued version must remain for the next
    // upload.
    const acknowledgedVersions = new Map(
      acknowledgedActivities.map(activity => [
        activity.id,
        JSON.stringify(activity),
      ])
    );

    await withPendingQueueLock(async () => {
      const pending = await readPendingActivities();
      const filtered = pending.filter(activity => {
        const acknowledgedVersion = acknowledgedVersions.get(activity.id);
        return (
          !acknowledgedVersion ||
          acknowledgedVersion !== JSON.stringify(activity)
        );
      });
      await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(filtered));
    });
  } catch (err) {
    console.error('Failed to remove synced activities from queue:', err);
  }
}

async function performPendingPush(
  accessToken: string,
  lastSyncTime?: string | null
): Promise<PendingPushResult> {
  const pendingActivities = await getPendingActivities();
  if (pendingActivities.length === 0) {
    return { attempted: false, ok: true };
  }

  try {
    const response = await fetch(getApiEndpoint('/api/activities'), {
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

    if (!response.ok) {
      return { attempted: true, ok: false };
    }

    const data: SyncResponse = await response.json();
    const conflictIds = new Set(data.conflicts || []);
    const acknowledgedActivities = pendingActivities.filter(
      activity => !conflictIds.has(activity.id)
    );
    await removePendingSync(acknowledgedActivities);

    return { attempted: true, ok: true, data };
  } catch (err) {
    console.error('Failed to push activities to server:', err);
    return { attempted: true, ok: false };
  }
}

function pushPendingActivities(
  accessToken: string,
  lastSyncTime?: string | null
): Promise<PendingPushResult> {
  // Foreground initialization and the debounced background uploader can fire
  // close together. Share the same request instead of posting the queue twice.
  if (activePendingPush) return activePendingPush;

  activePendingPush = performPendingPush(accessToken, lastSyncTime).finally(
    () => {
      activePendingPush = null;
    }
  );
  return activePendingPush;
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
    // Server tombstone: honor it only when it's newer than the local copy —
    // the same last-write-wins rule as everything else. An unconditional
    // delete here let stale tombstones destroy newer local edits.
    if (serverActivity.deleted_at) {
      const local = merged.get(serverActivity.id);
      const localTime = (local as SyncableActivity | undefined)?.updated_at
        ? new Date((local as SyncableActivity).updated_at).getTime()
        : 0;
      const serverTime = new Date(serverActivity.updated_at).getTime();
      if (serverTime > localTime) {
        merged.delete(serverActivity.id);
      }
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
    // Builds before automatic upload could lose pending markers when several
    // activities were queued at once. Reconcile timestamped local workouts one
    // time so existing plans are backfilled after upgrading.
    await backfillPendingActivities(localActivities);
    const lastSyncTime = await getLastSyncTime();

    // 1. Fetch server activities updated since last sync
    let serverActivities: SyncableActivity[] = [];
    let fetchSyncTime: string | null = null;
    try {
      const url = lastSyncTime
        ? getApiEndpoint(
            `/api/activities?since=${encodeURIComponent(lastSyncTime)}`
          )
        : getApiEndpoint('/api/activities');

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
    const pushResult = await pushPendingActivities(accessToken, lastSyncTime);
    if (pushResult.ok && pushResult.data) {
      // If there are newer server activities, merge them too
      if (pushResult.data.serverActivities?.length > 0) {
        const finalMerged = mergeActivities(
          merged,
          pushResult.data.serverActivities
        );
        onActivitiesUpdated(finalMerged);
      }

      await setLastSyncTime(pushResult.data.syncTime);
    } else if (!pushResult.attempted && fetchSyncTime) {
      // Use server-provided sync time to avoid client/server clock drift
      await setLastSyncTime(fetchSyncTime);
    }
  } catch (err) {
    console.error('Sync failed:', err);
  }
}

// Queue a single activity change for the next sync flush.
export async function pushActivityChange(
  _accessToken: string,
  activity: Activity,
  deleted: boolean = false
): Promise<void> {
  const syncableActivity: SyncableActivity = {
    ...activity,
    updated_at: new Date().toISOString(),
    deleted_at: deleted ? new Date().toISOString() : undefined,
  };

  await addToPendingSync(syncableActivity);
}

// Push any queued local changes to the server. Returns true when the queue is
// fully drained. Call before sign-out — clearing sync data with a non-empty
// queue permanently discards those changes.
export async function flushPendingSync(accessToken: string): Promise<boolean> {
  if (!API_URL) return true;

  const lastSyncTime = await getLastSyncTime();
  const result = await pushPendingActivities(accessToken, lastSyncTime);
  if (!result.ok) return false;

  // New edits may have arrived while the request was in flight. The queue is
  // drained only when there is truly nothing left to upload.
  const remainingActivities = await getPendingActivities();
  return remainingActivities.length === 0;
}

// Clear all sync data (call on logout)
export async function clearSyncData(): Promise<void> {
  try {
    await withPendingQueueLock(() =>
      AsyncStorage.multiRemove([
        LAST_SYNC_KEY,
        PENDING_SYNC_KEY,
        PENDING_SYNC_BACKFILL_KEY,
      ])
    );
  } catch (err) {
    console.error('Failed to clear sync data:', err);
  }
}
