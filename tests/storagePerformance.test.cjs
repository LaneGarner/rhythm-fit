const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const loadTs = require('./helpers/loadTs.cjs');
test('history writes stay ordered, unchanged snapshots are deduplicated, and clearing invalidates the cache', async () => {
  const values = new Map(),
    writes = [];
  const storage = {
    setItem: async (key, value) => {
      if (value.includes('old')) await new Promise(done => setTimeout(done, 5));
      values.set(key, value);
      writes.push(value);
    },
    removeItem: async key => values.delete(key),
  };
  const load = loadTs({
    '@react-native-async-storage/async-storage': {
      __esModule: true,
      default: storage,
    },
    '../services/libraryService': {},
    '../services/exerciseService': {},
    '../services/activityTypeService': {},
    '../services/equipmentService': {},
  });
  const api = load(path.join(__dirname, '../utils/storage.ts'));
  await Promise.all([
    api.saveActivities([{ id: 'old' }]),
    api.saveActivities([{ id: 'new' }]),
  ]);
  assert.equal(JSON.parse(values.get('activities'))[0].id, 'new');
  await api.saveActivities([{ id: 'new' }]);
  assert.equal(writes.length, 2);
  await api.clearAllActivities();
  await api.saveActivities([{ id: 'new' }]);
  assert.equal(writes.length, 3);
});
