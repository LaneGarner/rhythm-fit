const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function harness() {
  const hydration = deferred();
  const download = deferred();
  const slots = [];
  let cursor = 0,
    dirty = true,
    result;
  let effects = [],
    splash;
  const listeners = new Set();
  const state = { activities: { data: [] } };
  const syncCalls = [];
  const equal = (a, b) =>
    a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const memo = (value, deps) => {
    const index = cursor++;
    if (!slots[index] || !equal(slots[index].deps, deps))
      slots[index] = { value, deps };
    return slots[index].value;
  };
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [
        slots[index],
        next => {
          const value = typeof next === 'function' ? next(slots[index]) : next;
          if (!Object.is(value, slots[index])) {
            slots[index] = value;
            dirty = true;
          }
        },
      ];
    },
    useRef: value => memo({ current: value }, []),
    useCallback: memo,
    useEffect(callback, deps) {
      const index = cursor++;
      if (!slots[index] || !equal(slots[index].deps, deps)) {
        slots[index]?.cleanup?.();
        slots[index] = { deps };
        effects.push(() => {
          slots[index].cleanup = callback();
        });
      }
    },
  };
  const dispatch = action => {
    if (action === 'hydrate')
      return {
        unwrap: () =>
          hydration.promise.then(data => {
            state.activities.data = data;
            dirty = true;
          }),
      };
    state.activities.data = action.payload;
    dirty = true;
  };
  const user = { id: 'owner' };
  const auth = {
    user,
    isLoading: false,
    isConfigured: true,
    getAccessToken: () => 'token',
  };
  const appState = {
    currentState: 'active',
    addEventListener: (_, callback) => {
      listeners.add(callback);
      return { remove: () => listeners.delete(callback) };
    },
  };
  const exports = {};
  const modules = {
    react,
    'react-native': { AppState: appState },
    'react-redux': {
      useDispatch: () => dispatch,
      useSelector: select => select(state),
    },
    '../context/AuthContext': { useAuth: () => auth },
    '../config/api': { isBackendConfigured: () => true },
    '../redux/activitySlice': {
      loadActivitiesFromStorage: () => 'hydrate',
      setActivities: payload => ({ payload }),
    },
    '../services/syncService': {
      syncActivities: (...args) => {
        syncCalls.push(args);
        return download.promise;
      },
    },
    '../services/exerciseService': { initializeExercises() {} },
    '../services/activityTypeService': { initializeActivityTypes() {} },
    '../services/equipmentService': { fetchEquipment: async () => {} },
    '../services/libraryService': { fetchLibrary: async () => {} },
    '../redux/store': { store: { getState: () => state } },
    '../utils/storage': { loadTutorialCompleted: async () => true },
  };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(
        require.resolve('../hooks/useAppInitialization.ts'),
        'utf8'
      ),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
      }
    ).outputText,
    {
      exports,
      require: name => {
        assert.ok(modules[name], `Unexpected dependency ${name}`);
        return modules[name];
      },
      console: { error() {} },
      setTimeout: callback => {
        splash = callback;
        return 1;
      },
      clearTimeout() {},
    }
  );
  return {
    hydration,
    download,
    syncCalls,
    state,
    get result() {
      return result;
    },
    splash: () => splash(),
    foreground() {
      for (const callback of listeners) {
        callback('background');
        callback('active');
      }
    },
    async flush() {
      for (let i = 0; i < 12; i++) {
        if (dirty) {
          dirty = false;
          cursor = 0;
          result = exports.useAppInitialization();
          const pending = effects;
          effects = [];
          pending.forEach(effect => effect());
        }
        await Promise.resolve();
      }
    },
  };
}

test('saved workouts become usable while the initial network sync is still pending', async () => {
  const h = harness();
  await h.flush();
  h.splash();
  await h.flush();
  assert.equal(h.result.isReady, false);
  assert.equal(h.syncCalls.length, 0);
  h.hydration.resolve([{ id: 'phone-only-workout' }]);
  await h.flush();
  assert.equal(h.result.isReady, true);
  assert.equal(h.syncCalls.length, 1);
  assert.equal(h.syncCalls[0][1][0].id, 'phone-only-workout');
  h.download.reject(new Error('offline'));
  await h.flush();
  assert.equal(h.result.isReady, true);
  assert.equal(h.state.activities.data[0].id, 'phone-only-workout');
});

test('foregrounding before local hydration cannot begin an empty-history sync', async () => {
  const h = harness();
  await h.flush();
  h.foreground();
  await h.flush();
  assert.equal(h.syncCalls.length, 0);
  h.hydration.resolve([{ id: 'old-history' }]);
  await h.flush();
  h.foreground();
  await h.flush();
  assert.equal(h.syncCalls.length, 2);
  assert.equal(h.syncCalls[1][1][0].id, 'old-history');
  h.download.resolve();
  await h.flush();
});
