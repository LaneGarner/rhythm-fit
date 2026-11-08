const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  selectWorkoutData,
  createWorkoutExport,
  workoutExportSummary,
  validExportDate,
} = require('./helpers/loadTs.cjs')()(
  require.resolve('../utils/workoutExport.ts')
);
const record = (id, date) => ({
  id,
  date,
  type: 'weight-training',
  name: 'Squat',
  completed: false,
  sets: [
    {
      id: `${id}-set`,
      completed: false,
      weight: 185,
      reps: 5,
      notes: 'set note',
    },
  ],
  notes: 'workout note',
  supersetId: 'pair',
  trackingFields: ['weight', 'reps'],
  customFutureField: { value: 'preserved' },
});
function fixture() {
  return {
    accountId: 'owner',
    activities: [
      record('first', '2020-12-31'),
      record('second', '2021-01-01'),
      { ...record('empty', '2021-01-02'), sets: [] },
      { id: 'legacy', name: 'Undated', type: 'other', completed: false },
    ],
    pending: [
      { ...record('first', '2020-12-31'), deleted_at: '2026-11-07' },
      { id: 'second', deleted_at: '2026-11-07' },
      record('outside', '2020-12-30'),
    ],
    preSyncSnapshot: {
      savedAt: '2026-11-07',
      activities: [
        record('saved', '2021-01-01'),
        record('outside', '2020-01-01'),
      ],
      pending: [record('saved', '2021-01-01'), record('outside', '2020-01-01')],
    },
  };
}
test('all-history JSON preserves raw fields, undated legacy records, queued deletions and recovery arrays', () => {
  const source = fixture(),
    before = JSON.stringify(source),
    file = createWorkoutExport(source, { type: 'all' }, 'json'),
    value = JSON.parse(file.contents);
  assert.deepEqual(value.activities, source.activities);
  assert.deepEqual(value.pending, source.pending);
  assert.deepEqual(value.preSyncSnapshot, source.preSyncSnapshot);
  assert.equal(value.version, 2);
  assert.equal(value.summary.activities, 4);
  assert.equal(value.summary.sets, 2);
  assert.equal(value.summary.days, 3);
  assert.equal(JSON.stringify(source), before);
});
test('custom dates include both boundaries across years and filter recovery copies and queued changes', () => {
  const selected = selectWorkoutData(fixture(), {
    type: 'dates',
    from: '2020-12-31',
    to: '2021-01-01',
  });
  assert.deepEqual(
    selected.activities.map(a => a.id),
    ['first', 'second']
  );
  assert.deepEqual(
    selected.pending.map(a => a.id),
    ['first', 'second']
  );
  assert.deepEqual(
    selected.preSyncSnapshot.activities.map(a => a.id),
    ['saved']
  );
  assert.deepEqual(
    selected.preSyncSnapshot.pending.map(a => a.id),
    ['saved']
  );
  const summary = workoutExportSummary(selected);
  assert.equal(summary.earliest, '2020-12-31');
  assert.equal(summary.latest, '2021-01-01');
  assert.equal(summary.sets, 2);
  assert.equal(
    createWorkoutExport(
      fixture(),
      { type: 'dates', from: '2020-12-31', to: '2021-01-01' },
      'json'
    ).contents.includes('"outside"'),
    false
  );
});
test('invalid dates reject and empty ranges still produce valid exports', () => {
  assert.equal(validExportDate('2024-02-29'), true);
  assert.equal(validExportDate('2023-02-29'), false);
  assert.throws(() =>
    selectWorkoutData(fixture(), {
      type: 'dates',
      from: '2021-01-02',
      to: '2021-01-01',
    })
  );
  assert.throws(() =>
    selectWorkoutData(fixture(), {
      type: 'dates',
      from: '2021-02-30',
      to: '2021-03-01',
    })
  );
  for (const format of ['json', 'csv', 'text'])
    assert.equal(
      createWorkoutExport(
        fixture(),
        { type: 'dates', from: '1999-01-01', to: '1999-01-02' },
        format
      ).summary.activities,
      0
    );
});
function csvRows(input) {
  const rows = [];
  let row = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (quoted && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if (c === '\r' && input[i + 1] === '\n' && !quoted) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
    } else cell += c;
  }
  return rows;
}
test('CSV keeps zero-set activities, multiline notes, quotes, Unicode and protects spreadsheet text cells', () => {
  const source = fixture();
  source.activities[0].name = '=HYPERLINK("bad")';
  source.activities[0].notes = 'Hello, "world"\n🏋️';
  source.activities[0].sets[0].weight = -5;
  const file = createWorkoutExport(source, { type: 'all' }, 'csv');
  const rows = csvRows(file.contents.replace(/^\uFEFF/, ''));
  assert.equal(rows.length, 5);
  assert.ok(rows.every(row => row.length === rows[0].length));
  const first = rows.find(row => row[0] === 'first');
  assert.equal(first[3], '\'=HYPERLINK("bad")');
  assert.equal(first[5], 'Hello, "world"\n🏋️');
  assert.equal(first[17], '-5');
  assert.ok(rows.some(row => row[0] === 'empty' && row[14] === ''));
});
test('text includes every measurement and notes and respects the chosen range', () => {
  const source = fixture();
  source.activities[0].sets[0] = {
    ...source.activities[0].sets[0],
    weight: 0,
    reps: 0,
    time: 90,
    distance: 2.5,
    band: 'red',
  };
  const file = createWorkoutExport(
    source,
    { type: 'dates', from: '2020-12-31', to: '2020-12-31' },
    'text'
  );
  for (const expected of [
    '0 lb',
    '0 reps',
    '90 seconds',
    'Distance: 2.5',
    'Band: red',
    'set note',
    'workout note',
    'Superset: pair',
  ])
    assert.ok(file.contents.includes(expected));
  assert.equal(file.summary.activities, 1);
  assert.equal(file.contents.includes('2021-01-01 —'), false);
});
