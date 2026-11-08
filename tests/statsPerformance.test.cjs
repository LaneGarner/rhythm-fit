const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const dayjs = require('dayjs');
const load = require('./helpers/loadTs.cjs')();
const stats = load(path.join(__dirname, '../services/statsService.ts'));
const { isActivityComplete } = load(
  path.join(__dirname, '../utils/supersetUtils.ts')
);
const { sampleChartPoints } = load(
  path.join(__dirname, '../utils/chartSampling.ts')
);
const fixture = Array.from({ length: 2500 }, (_, i) => ({
  id: String(i),
  date: dayjs('2026-11-07')
    .subtract(Math.floor(i / 5), 'day')
    .format('YYYY-MM-DD'),
  name: i % 2 ? 'Squat' : 'squat',
  type: 'weight-training',
  completed: i % 7 !== 0,
  sets: [{ completed: i % 7 !== 0, weight: 100 + (i % 10), reps: 5 }],
}));
function legacyVolume(activities, range, now) {
  const result = [];
  const count =
    range === 7 ? 7 : range === 0 ? 12 : Math.min(Math.floor(range / 7), 12);
  for (let i = count - 1; i >= 0; i--) {
    const start =
      range === 7
        ? now.subtract(i, 'day')
        : range === 0
          ? now.subtract(i, 'month').startOf('month')
          : now.subtract(i * 7 + 6, 'day');
    const end =
      range === 0
        ? now.subtract(i, 'month').endOf('month')
        : now.subtract(i * 7, 'day');
    let value = 0;
    for (const a of activities) {
      const d = dayjs(a.date);
      if (
        (range === 7
          ? d.isSame(start, 'day')
          : d.isAfter(start.subtract(1, 'day')) &&
            d.isBefore(end.add(1, 'day'))) &&
        isActivityComplete(a) &&
        a.sets
      )
        for (const set of a.sets)
          if (set.completed && set.weight && set.reps)
            value += set.weight * set.reps;
    }
    result.push({ label: start.format(range === 0 ? 'MMM' : 'M/D'), value });
  }
  return result;
}
test('batched volume aggregation preserves daily, weekly, monthly and year-boundary results', () => {
  for (const now of [
    dayjs('2026-11-07T16:00:00'),
    dayjs('2026-01-01T00:00:00'),
  ])
    for (const range of [7, 30, 90, 365, 0])
      assert.deepEqual(
        stats.calculateVolumeBuckets(fixture, range, now),
        legacyVolume(fixture, range, now)
      );
});
test('top exercises retain case-insensitive histories and legacy tie ordering', () => {
  const expected = stats
    .getUniqueExercises(fixture)
    .map(name => {
      const value = stats.calculateExerciseStats(fixture, name);
      return { name, sessions: value?.sessions || 0, stats: value };
    })
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 5);
  assert.deepEqual(stats.calculateTopExercises(fixture), expected);
  const next = fixture.map(a =>
    a.id === '1' ? { ...a, name: 'New exercise' } : a
  );
  assert.ok(stats.calculateExerciseStats(next, 'New exercise'));
  assert.equal(stats.calculateExerciseStats(fixture, 'New exercise'), null);
});
test('chart sampling bounds display work, preserves endpoints and extrema, and leaves exact history intact', () => {
  const data = Array.from({ length: 10000 }, (_, i) => ({
    value: i === 4567 ? 100000 : i === 2345 ? -100000 : i % 15,
    date: String(i),
  }));
  const before = JSON.stringify(data),
    display = sampleChartPoints(data);
  assert.ok(display.length <= 160);
  assert.equal(display[0], data[0]);
  assert.equal(display.at(-1), data.at(-1));
  assert.ok(display.includes(data[4567]));
  assert.ok(display.includes(data[2345]));
  assert.equal(JSON.stringify(data), before);
});
