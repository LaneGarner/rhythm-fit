const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      require: name => load(path.resolve(path.dirname(file), `${name}.ts`)),
    }
  );
  return exports;
}
const {
  buildSessionItems,
  getUpcomingActivities,
  nextSessionIndex,
  parseWorkoutSession,
  summarizeUpcomingSets,
} = load(
  path.resolve(__dirname, '../utils/workoutSession.ts')
);
const row = (id, extra = {}) => ({
  id,
  name: id,
  date: '2026-11-07',
  type: 'weight-training',
  completed: false,
  sets: [{ id: id + '-set', completed: false }],
  ...extra,
});
const records = [
  row('squat', { order: 1 }),
  row('press', { order: 2 }),
  row('pull', { order: 3, supersetId: 'pair', supersetPosition: 1 }),
  row('raise', { order: 4, supersetId: 'pair', supersetPosition: 2 }),
  row('running', { order: 5, type: 'cardio' }),
  row('old', { date: '2026-11-06' }),
  row('finished', { completed: true }),
];
function session(items = buildSessionItems(records, '2026-11-07')) {
  return { version: 1, date: '2026-11-07', items, index: 0, restDuration: 120 };
}

test('a session keeps day order, groups supersets once, and excludes completed or other-day workouts', () => {
  const items = buildSessionItems(records, '2026-11-07');
  assert.equal(items.length, 4);
  assert.equal(items[0].id, 'squat');
  assert.equal(items[2].route, 'SupersetExecution');
  assert.equal(items[2].activityIds.length, 2);
  assert.equal(items[3].id, 'running');
});
test('advancing skips already completed and deleted workouts', () => {
  const s = session();
  const changed = records
    .filter(a => a.id !== 'press')
    .map(a => (a.supersetId === 'pair' ? { ...a, completed: true } : a));
  assert.equal(nextSessionIndex(s, changed), 3);
  assert.equal(nextSessionIndex({ ...s, index: 3 }, changed), -1);
});
test('a session selected without running finishes without completing or removing running', () => {
  const s = session(
    buildSessionItems(records, '2026-11-07').filter(
      item => item.id !== 'running'
    )
  );
  const saved = JSON.stringify(records);
  assert.equal(
    nextSessionIndex({ ...s, index: s.items.length - 1 }, records),
    -1
  );
  assert.equal(JSON.stringify(records), saved);
  assert.equal(records.find(a => a.id === 'running').completed, false);
});
test('session position and running or paused rest survive serialization', () => {
  const running = {
    ...session(),
    index: 2,
    rest: { remaining: 90, endsAt: 123456789 },
  };
  const restored = parseWorkoutSession(JSON.stringify(running));
  assert.equal(restored.index, 2);
  assert.equal(restored.rest.endsAt, 123456789);
  const paused = { ...running, rest: { remaining: 90 } };
  assert.equal(parseWorkoutSession(JSON.stringify(paused)).rest.remaining, 90);
});
test('corrupt and incompatible stored sessions cannot become active', () => {
  for (const value of [
    'bad json',
    JSON.stringify({ ...session(), index: 99 }),
    JSON.stringify({ ...session(), restDuration: 0 }),
    JSON.stringify({ ...session(), rest: { remaining: -5 } }),
    JSON.stringify({ ...session(), version: 2 }),
  ])
    assert.equal(parseWorkoutSession(value), null);
});

test('preview includes separately listed repeats, skips completed entries, and keeps superset order', () => {
  const day = [
    row('squat', { order: 0 }),
    row('squat-again', { name: ' Squat ', order: 1 }),
    row('done', { order: 2 }),
    ...records.slice(2, 4),
  ];
  const s = session(buildSessionItems(day, day[0].date));
  day[2].completed = true;
  assert.equal(getUpcomingActivities(s.items, 0, day)[0].id, 'squat-again');
  const preview = getUpcomingActivities(s.items, 1, day);
  assert.deepEqual(Array.from(preview, activity => activity.id), ['pull', 'raise']);
  assert.equal(getUpcomingActivities(s.items, 3, day).length, 0);
});

test('preview summarizes remaining sets with matching and varied targets', () => {
  const activity = row('intervals', {
    trackingFields: ['reps', 'time'],
    sets: [
      { reps: 12, completed: true },
      { reps: 8, time: 90 },
      { reps: 8, time: 90 },
      { reps: 6, time: 45 },
    ],
  });
  assert.equal(
    summarizeUpcomingSets(activity),
    '2 sets · 8 reps · 1:30 / 1 set · 6 reps · 0:45'
  );
});

test('normal execution can preview from a completed activity in day order', () => {
  const day = [row('squat', { completed: true, order: 0 }), row('press', { order: 1 })];
  const items = buildSessionItems(day, day[0].date, true);
  const preview = getUpcomingActivities(items, 0, day);
  assert.deepEqual(Array.from(preview, activity => activity.id), ['press']);
});

test('session preview only looks at the selected entries', () => {
  const day = [row('squat', { order: 0 }), row('press', { order: 1 }), row('pull', { order: 2 })];
  const selected = buildSessionItems([day[0], day[2]], day[0].date);
  assert.equal(getUpcomingActivities(selected, 0, day)[0].id, 'pull');
  assert.equal(getUpcomingActivities(selected, 1, day).length, 0);
});
