const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness({ corrupt = false, badWrite = false } = {}) {
  const storage = new Map([
    [
      'activities',
      corrupt
        ? '{broken'
        : JSON.stringify([
            { id: 'phone-only', sets: [{ weight: 185, reps: 5 }] },
          ]),
    ],
    [
      'rhythm_pending_sync',
      JSON.stringify([{ id: 'deleted-workout', deleted_at: '2026-11-07' }]),
    ],
    [
      'rhythm_recovery_backup_v2:owner',
      JSON.stringify({ activities: [{ id: 'original-history' }] }),
    ],
    ['sb-auth-token', 'SECRET'],
    ['rhythm_recovery_backup_v2:other', 'OTHER ACCOUNT'],
  ]);
  const files = new Map(),
    shared = [],
    readKeys = [];
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(
        require.resolve('../services/workoutBackupService.ts'),
        'utf8'
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          esModuleInterop: true,
        },
      }
    ).outputText,
    {
      exports,
      require: name => {
        if (name.includes('async-storage'))
          return {
            __esModule: true,
            default: {
              multiGet: async keys => {
                readKeys.push(...keys);
                return keys.map(key => [key, storage.get(key) ?? null]);
              },
            },
          };
        if (name === 'expo-file-system/legacy')
          return {
            documentDirectory: 'file:///local/',
            writeAsStringAsync: async (uri, value) => files.set(uri, value),
            readAsStringAsync: async uri =>
              badWrite ? 'truncated' : files.get(uri),
          };
        if (name === 'expo-sharing')
          return {
            isAvailableAsync: async () => true,
            shareAsync: async uri => shared.push(uri),
          };
        throw new Error(name);
      },
    }
  );
  return { exports, storage, files, shared, readKeys };
}

test('exports local history, queued deletions, and the original snapshot without credentials or other accounts', async () => {
  const h = harness();
  const before = [...h.storage];
  await h.exports.exportWorkoutBackup('owner');
  assert.equal(h.shared.length, 1);
  const text = h.files.get(h.shared[0]);
  const data = JSON.parse(text);
  assert.equal(data.activities[0].id, 'phone-only');
  assert.equal(data.pending[0].id, 'deleted-workout');
  assert.equal(data.preSyncSnapshot.activities[0].id, 'original-history');
  assert.equal(text.includes('SECRET'), false);
  assert.equal(text.includes('OTHER ACCOUNT'), false);
  assert.equal(h.readKeys.length, 3);
  assert.deepEqual([...h.storage], before);
});

test('invalid storage and a failed file verification never open sharing or modify source history', async () => {
  for (const options of [{ corrupt: true }, { badWrite: true }]) {
    const h = harness(options);
    const before = [...h.storage];
    await assert.rejects(h.exports.exportWorkoutBackup('owner'));
    assert.equal(h.shared.length, 0);
    assert.deepEqual([...h.storage], before);
  }
});
