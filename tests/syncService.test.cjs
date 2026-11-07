const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const cutoff = '2026-11-07T20:00:00.000Z';
const activity = (id, updated_at = cutoff) => ({
  id,
  name: 'Workout',
  type: 'weight-training',
  date: '2020-01-01',
  completed: true,
  updated_at,
});
function harness({
  local = [],
  remote = [],
  initial = {},
  failBatch,
  legacy = false,
  failDownload = false,
  onDownload,
} = {}) {
  const storage = new Map(Object.entries(initial));
  const requests = [];
  const exports = {};
  let current = local;
  let batch = 0;
  const asyncStorage = {
    getItem: async key => storage.get(key) ?? null,
    setItem: async (key, value) => {
      storage.set(key, value);
    },
    getAllKeys: async () => [...storage.keys()],
    multiRemove: async keys => keys.forEach(key => storage.delete(key)),
  };
  const response = (ok, data) => ({
    ok,
    status: ok ? 200 : 503,
    json: async () => data,
  });
  const fetch = async (url, options) => {
    const body = options.body ? JSON.parse(options.body) : null;
    requests.push({ url, method: options.method, body });
    if (options.method === 'GET') {
      if (onDownload)
        await onDownload(
          exports,
          () => current,
          value => {
            current = value;
          }
        );
      return response(!failDownload, {
        activities: remote,
        syncTime: cutoff,
        ...(!legacy && { historyComplete: true }),
      });
    }
    batch++;
    if (batch === failBatch) return response(false, {});
    return response(true, {
      synced: body.activities.length,
      conflicts: [],
      serverActivities: [],
      syncTime: '2099-01-01T00:00:00.000Z',
    });
  };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(require.resolve('../services/syncService.ts'), 'utf8'),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          esModuleInterop: true,
        },
      }
    ).outputText,
    {
      exports,
      console: { error() {} },
      fetch,
      require: name =>
        name.includes('async-storage')
          ? { __esModule: true, default: asyncStorage }
          : {
              API_URL: 'https://test.invalid',
              getApiEndpoint: p => `https://test.invalid${p}`,
            },
    }
  );
  return {
    exports,
    storage,
    requests,
    get current() {
      return current;
    },
    sync: () =>
      exports.syncActivities(
        'test-token',
        current,
        value => {
          current = value;
        },
        {
          userId: 'owner',
          getLatestActivities: () => current,
        }
      ),
  };
}

test('repairs a previously advanced cursor and retains years of local history', async () => {
  const old = activity('old-without-timestamp');
  delete old.updated_at;
  const remote = Array.from({ length: 2501 }, (_, i) => activity(`cloud-${i}`));
  const h = harness({
    local: [old],
    remote,
    initial: { rhythm_last_sync_time: '2099-01-01T00:00:00.000Z' },
  });
  await h.sync();
  assert.equal(h.current.length, 2502);
  assert.equal(h.requests[0].url, 'https://test.invalid/api/activities');
  assert.equal(
    h.requests[1].body.activities[0].updated_at,
    '1970-01-01T00:00:00.000Z'
  );
  assert.equal(h.storage.get('rhythm_last_sync_time'), cutoff);
  assert.equal(h.storage.get('rhythm_history_recovery_v2:owner'), 'complete');
  assert.equal(
    JSON.parse(h.storage.get('rhythm_recovery_backup_v2:owner')).activities[0]
      .id,
    old.id
  );
  assert.equal(JSON.parse(h.storage.get('activities')).length, 2502);
  await h.sync();
  assert.equal(
    h.requests.some(r => r.url.includes('?since=')),
    false
  );
});
test('uploads history in batches and resumes after a failure without dropping remaining workouts', async () => {
  const h = harness({
    local: Array.from({ length: 120 }, (_, i) => activity(String(i))),
    failBatch: 2,
  });
  await assert.rejects(h.sync(), /remain queued/);
  assert.equal(JSON.parse(h.storage.get('rhythm_pending_sync')).length, 70);
  await h.sync();
  assert.equal(JSON.parse(h.storage.get('rhythm_pending_sync')).length, 0);
  assert.deepEqual(
    h.requests.filter(r => r.body).map(r => r.body.activities.length),
    [50, 50, 50, 20]
  );
});
test('legacy/truncated servers never mark full history recovered or advance the cursor', async () => {
  const h = harness({ remote: [activity('cloud')], legacy: true });
  await h.sync();
  assert.equal(h.storage.has('rhythm_history_recovery_v2:owner'), false);
  assert.equal(h.storage.has('rhythm_last_sync_time'), false);
});
test('a failed download still uploads local workouts but cannot advance the cursor', async () => {
  const h = harness({ local: [activity('local')], failDownload: true });
  await assert.rejects(h.sync(), /download failed/);
  assert.equal(h.requests.filter(r => r.method === 'POST').length, 1);
  assert.equal(h.storage.has('rhythm_last_sync_time'), false);
  assert.equal(
    JSON.parse(h.storage.get('rhythm_recovery_backup_v2:owner')).activities
      .length,
    1
  );
});
test('edits and deletions made while downloading are not overwritten', async () => {
  const h = harness({
    local: [activity('edit', '2026-01-01'), activity('delete', '2026-01-01')],
    remote: [activity('edit', '2026-02-01'), activity('delete', '2026-02-01')],
    onDownload: async (api, get, set) => {
      const edit = { ...activity('edit'), name: 'Changed during download' };
      set([edit]);
      await api.addToPendingSync(edit);
      await api.addToPendingSync({ ...activity('delete'), deleted_at: cutoff });
    },
  });
  await h.sync();
  assert.equal(h.current.length, 1);
  assert.equal(h.current[0].name, 'Changed during download');
});
test('sign-out resets recovery so signing in downloads full history again, but retains backup', async () => {
  const h = harness({ local: [activity('local')] });
  await h.sync();
  await h.exports.clearSyncData();
  assert.equal(h.storage.has('rhythm_history_recovery_v2:owner'), false);
  assert.equal(h.storage.has('rhythm_pending_sync_backfill_v2:owner'), false);
  assert.equal(h.storage.has('rhythm_recovery_backup_v2:owner'), true);
});

// Backfilled records retain their historical edit timestamps. A second device
// must discover them even after it has previously completed a full download.
test('later syncs discover old workouts backfilled by another device', async () => {
  const remote = [activity('initial')];
  const h = harness({ remote });
  await h.sync();
  remote.push(activity('years-old-recovered', '2020-01-01T00:00:00.000Z'));
  await h.sync();
  assert.equal(h.current.length, 2);
  assert.ok(h.current.some(a => a.id === 'years-old-recovered'));
  assert.equal(
    h.requests.some(r => r.url.includes('?since=')),
    false
  );
});
