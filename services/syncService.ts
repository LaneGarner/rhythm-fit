import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, getApiEndpoint } from '../config/api';
import { Activity } from '../types/activity';

const LAST_SYNC_KEY = 'rhythm_last_sync_time';
const PENDING_SYNC_KEY = 'rhythm_pending_sync';
const PENDING_SYNC_BACKFILL_KEY = 'rhythm_pending_sync_backfill_v2';
const HISTORY_RECOVERY_KEY = 'rhythm_history_recovery_v2:';
const RECOVERY_BACKUP_KEY = 'rhythm_recovery_backup_v2:';
const UPLOAD_BATCH_SIZE = 50;

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
  historyComplete?: boolean;
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
  localActivities: Activity[],
  userId: string
): Promise<void> {
  await withPendingQueueLock(async () => {
    const alreadyBackfilled = await AsyncStorage.getItem(
      `${PENDING_SYNC_BACKFILL_KEY}:${userId}`
    );
    if (alreadyBackfilled) return;

    const pendingActivities = await readPendingActivities();
    const pendingById = new Map(
      pendingActivities.map(activity => [activity.id, activity])
    );

    for (const activity of localActivities) {
      // Preserve legacy workouts without timestamps too. An old fallback
      // date allows insertion without overwriting a newer server version.
      const updatedAt = activity.updated_at || '1970-01-01T00:00:00.000Z';

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
    await AsyncStorage.setItem(
      `${PENDING_SYNC_BACKFILL_KEY}:${userId}`,
      'complete'
    );
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
  accessToken: string
): Promise<PendingPushResult> {
  const pendingActivities = await getPendingActivities();
  if (pendingActivities.length === 0) return { attempted: false, ok: true };

  const combined: SyncResponse = {
    synced: 0,
    conflicts: [],
    serverActivities: [],
    syncTime: '',
  };
  try {
    for (
      let offset = 0;
      offset < pendingActivities.length;
      offset += UPLOAD_BATCH_SIZE
    ) {
      const batch = pendingActivities.slice(offset, offset + UPLOAD_BATCH_SIZE);
      const response = await fetch(getApiEndpoint('/api/activities'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        // Downloads own the sync cursor. Uploads only acknowledge these records.
        body: JSON.stringify({ activities: batch }),
      });
      if (!response.ok)
        throw new Error(`Workout upload failed (${response.status})`);
      const data: SyncResponse = await response.json();
      const conflicts = new Set(data.conflicts || []);
      await removePendingSync(
        batch.filter(activity => !conflicts.has(activity.id))
      );
      combined.synced += data.synced;
      combined.conflicts.push(...(data.conflicts || []));
      combined.serverActivities.push(...(data.serverActivities || []));
      // Keep rejected records queued; earlier acknowledged batches stay saved.
      if (conflicts.size) return { attempted: true, ok: false, data: combined };
    }
    return { attempted: true, ok: true, data: combined };
  } catch (err) {
    console.error('Failed to push activities to server:', err);
    return { attempted: true, ok: false, data: combined };
  }
}

function pushPendingActivities(
  accessToken: string
): Promise<PendingPushResult> {
  // Foreground initialization and the debounced background uploader can fire
  // close together. Share the same request instead of posting the queue twice.
  if (activePendingPush) return activePendingPush;

  activePendingPush = performPendingPush(accessToken).finally(() => {
    activePendingPush = null;
  });
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

interface SyncOptions {
  userId: string;
  getLatestActivities?: () => Activity[];
}

let activeHistorySync: Promise<void> | null = null;

// Reconcile full history on every sync. Recovered workouts keep their original
// edit timestamps, so a timestamp cursor could miss old records uploaded today.
// Never replace local history
// with the server list: reconcile versions and preserve pending edits/deletes.
export function syncActivities(
  accessToken: string,
  localActivities: Activity[],
  onActivitiesUpdated: (activities: Activity[]) => void,
  options: SyncOptions
): Promise<void> {
  if (!API_URL) return Promise.resolve();
  if (activeHistorySync) return activeHistorySync;
  activeHistorySync = performHistorySync(
    accessToken,
    localActivities,
    onActivitiesUpdated,
    options
  ).finally(() => {
    activeHistorySync = null;
  });
  return activeHistorySync;
}

async function performHistorySync(
  accessToken: string,
  localActivities: Activity[],
  onActivitiesUpdated: (activities: Activity[]) => void,
  options: SyncOptions
): Promise<void> {
  const recoveryKey = `${HISTORY_RECOVERY_KEY}${options.userId}`;
  const backupKey = `${RECOVERY_BACKUP_KEY}${options.userId}`;
  if (!(await AsyncStorage.getItem(backupKey))) {
    await AsyncStorage.setItem(
      backupKey,
      JSON.stringify({
        savedAt: new Date().toISOString(),
        activities: localActivities,
        pending: await getPendingActivities(),
      })
    );
  }
  await backfillPendingActivities(localActivities, options.userId);
  let latestActivities = localActivities;
  const applyServerChanges = async (serverActivities: SyncableActivity[]) => {
    const pending = await getPendingActivities();
    latestActivities = mergeActivities(
      mergeActivities(
        options.getLatestActivities?.() || latestActivities,
        serverActivities
      ),
      pending
    );
    onActivitiesUpdated(latestActivities);
    // Persist history before marking a download complete. The Redux storage
    // middleware is debounced and cannot acknowledge durability for us.
    await AsyncStorage.setItem('activities', JSON.stringify(latestActivities));
  };

  let downloadError: unknown;
  try {
    const url = getApiEndpoint('/api/activities');
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok)
      throw new Error(`Workout download failed (${response.status})`);
    const data: FetchResponse = await response.json();
    if (
      !Array.isArray(data.activities) ||
      !Number.isFinite(Date.parse(data.syncTime))
    ) {
      throw new Error('Invalid workout sync response');
    }
    await applyServerChanges(data.activities);
    // Older servers may still truncate. Keep retrying full recovery until the
    // server explicitly confirms it read every page.
    if (data.historyComplete === true) {
      await AsyncStorage.setItem(LAST_SYNC_KEY, data.syncTime);
      await AsyncStorage.setItem(recoveryKey, 'complete');
    }
  } catch (err) {
    downloadError = err;
    console.error('Failed to download workout history:', err);
  }

  // An unavailable download must not prevent uploading the phone's local data.
  const pushResult = await pushPendingActivities(accessToken);
  if (pushResult.data?.serverActivities.length) {
    await applyServerChanges(pushResult.data.serverActivities);
  }
  if (downloadError) throw downloadError;
  if (!pushResult.ok)
    throw new Error('Some workouts have not uploaded; they remain queued');
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

  const result = await pushPendingActivities(accessToken);
  if (!result.ok) return false;

  // New edits may have arrived while the request was in flight. The queue is
  // drained only when there is truly nothing left to upload.
  const remainingActivities = await getPendingActivities();
  return remainingActivities.length === 0;
}

// Clear all sync data (call on logout)
export async function clearSyncData(): Promise<void> {
  try {
    await withPendingQueueLock(async () => {
      const keys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove([
        LAST_SYNC_KEY,
        PENDING_SYNC_KEY,
        'rhythm_pending_sync_backfill_v1',
        ...keys.filter(
          key =>
            key.startsWith(PENDING_SYNC_BACKFILL_KEY) ||
            key.startsWith(HISTORY_RECOVERY_KEY)
        ),
      ]);
    });
  } catch (err) {
    console.error('Failed to clear sync data:', err);
  }
}
