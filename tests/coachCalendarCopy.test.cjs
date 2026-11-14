const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const load = require('./helpers/loadTs.cjs')({ 'expo-crypto': { randomUUID } });
const { previewCoachCalendar } = load(require('node:path').join(__dirname, '../services/coachCalendar.ts'));

test('copy a week by date range, preserving weekdays and leaving originals intact', () => {
  const calendar = [
    { id: 'a', date: '2026-11-09', name: 'Squat', completed: true },
    { id: 'b', date: '2026-11-14', name: 'Bench', completed: false },
    { id: 'c', date: '2026-11-15', name: 'Row', completed: false },
  ];
  const copy = { action: 'copy', sourceStart: '2026-11-09', sourceEnd: '2026-11-14', days: 7 };
  const patch = previewCoachCalendar([copy, copy], calendar, new Set(['a', 'b', 'c']));
  assert.deepEqual(patch.before, []);
  assert.deepEqual(patch.after.map(a => [a.name, a.date, a.completed]), [
    ['Squat', '2026-11-16', false],
    ['Bench', '2026-11-21', false],
  ]);
  assert.equal(calendar[0].completed, true);
  assert.equal(previewCoachCalendar([copy], calendar, new Set(['a'])), undefined);
});
