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
const { buildExecutionUnits, getExecutionOutcome } = load(
  path.resolve(__dirname, '../utils/workoutExecution.ts')
);
const set = (id, completed = false) => ({
  id,
  completed,
  weight: 185,
  reps: 5,
});
const activity = (id, sets) => ({
  id,
  name: id,
  date: '2026-11-07',
  type: 'weight-training',
  completed: false,
  sets,
  notes: 'retain me',
});

test('single sets reorder for display without changing set identity or original numbering', () => {
  const a = activity('a', [set('one', true), set('two')]);
  const units = buildExecutionUnits([a], false);
  assert.equal(units[0].entries[0].set.id, 'two');
  assert.equal(units[0].number, 2);
  assert.equal(a.sets[0].id, 'one');
});
test('single set completion starts rest, final completion finishes without another rest', () => {
  let a = activity('a', [set('one'), set('two')]);
  const first = getExecutionOutcome(
    [a],
    [{ activityId: 'a', setId: 'one', updates: { completed: true } }]
  );
  assert.equal(first.startRest, true);
  assert.equal(first.finished, false);
  a = first.updated[0];
  const last = getExecutionOutcome(
    [a],
    [{ activityId: 'a', setId: 'two', updates: { completed: true } }]
  );
  assert.equal(last.finished, true);
  assert.equal(last.startRest, false);
  assert.equal(last.updated[0].notes, 'retain me');
});
test('uneven supersets complete one round at a time and finish only after the last remaining set', () => {
  const a = activity('a', [set('a1'), set('a2')]);
  const b = activity('b', [set('b1')]);
  const units = buildExecutionUnits([a, b], true);
  assert.equal(units.length, 2);
  assert.equal(units[1].entries.length, 1);
  const round = getExecutionOutcome(
    [a, b],
    units[0].entries.map(({ activity, set }) => ({
      activityId: activity.id,
      setId: set.id,
      updates: { completed: true },
    }))
  );
  assert.equal(round.updated.find(a => a.id === 'b').completed, true);
  assert.equal(round.startRest, true);
  assert.equal(round.finished, false);
  const last = getExecutionOutcome(round.updated, [
    { activityId: 'a', setId: 'a2', updates: { completed: true } },
  ]);
  assert.equal(last.finished, true);
  assert.equal(last.startRest, false);
});
test('undoing completion clears activity completion and never starts rest', () => {
  const a = { ...activity('a', [set('one', true)]), completed: true };
  const outcome = getExecutionOutcome(
    [a],
    [{ activityId: 'a', setId: 'one', updates: { completed: false } }]
  );
  assert.equal(outcome.updated[0].completed, false);
  assert.equal(outcome.startRest, false);
  assert.equal(outcome.finished, false);
});
test('plate calculator changes do not trigger completion or timers, and missing sets are ignored', () => {
  const a = activity('a', [set('one')]);
  const outcome = getExecutionOutcome(
    [a],
    [{ activityId: 'a', setId: 'one', updates: { weight: 200 } }]
  );
  assert.equal(outcome.updated[0].sets[0].weight, 200);
  assert.equal(a.sets[0].weight, 185);
  assert.equal(outcome.startRest, false);
  assert.equal(outcome.finished, false);
  assert.equal(
    getExecutionOutcome(
      [a],
      [{ activityId: 'a', setId: 'missing', updates: { completed: true } }]
    ).updated.length,
    0
  );
});
