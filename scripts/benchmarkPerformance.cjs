const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..');
const requireApp = require('node:module').createRequire(
  path.join(root, 'package.json')
);
const ts = requireApp('typescript');
const dayjs = requireApp('dayjs');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} };
  cache.set(file, mod);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const fn = vm.runInThisContext(
    '(function(require,module,exports){' + code + '\n})',
    { filename: file }
  );
  fn(
    name =>
      name.startsWith('.')
        ? load(path.resolve(path.dirname(file), name) + '.ts')
        : requireApp(name),
    mod,
    mod.exports
  );
  return mod.exports;
}
const stats = load(path.join(root, 'services/statsService.ts'));
function measure(fn) {
  fn();
  const values = [];
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    fn();
    values.push(performance.now() - start);
  }
  values.sort((a, b) => a - b);
  return +values[2].toFixed(2);
}
const results = [];
for (const count of [2000, 10000, 25000]) {
  const data = Array.from({ length: count }, (_, i) => ({
    id: `fixture-${i}`,
    date: dayjs('2026-11-07')
      .subtract(Math.floor(i / 6), 'day')
      .format('YYYY-MM-DD'),
    type: 'weight-training',
    name: `Exercise ${i % 80}`,
    completed: true,
    updated_at: '2026-11-07T00:00:00Z',
    sets: Array.from({ length: 4 }, (_, j) => ({
      id: `set-${i}-${j}`,
      weight: 100 + (i % 100),
      reps: 8,
      completed: true,
    })),
  }));
  const serialized = JSON.stringify(data);
  const bytes = Buffer.byteLength(serialized);
  const row = {
    activities: count,
    exerciseNames: 80,
    setsPerActivity: 4,
    jsonMiB: +(bytes / 1048576).toFixed(2),
  };
  row.stringifyMs = measure(() => JSON.stringify(data));
  row.parseMs = measure(() => JSON.parse(serialized));
  row.overall30DayMs = measure(() => stats.calculateOverallStats(data, 30));
  row.consistency30DayMs = measure(() =>
    stats.calculateConsistencyStats(data, 30)
  );
  row.overallAllMs = measure(() => stats.calculateOverallStats(data, 0));
  row.consistencyAllMs = measure(() =>
    stats.calculateConsistencyStats(data, 0)
  );
  row.personalRecordsAllMs = measure(() =>
    stats.calculatePersonalRecords(data, 0)
  );
  row.topExercisesAllMs = measure(() =>
    stats
      .getUniqueExercises(data)
      .map(name => stats.calculateExerciseStats(data, name))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5)
  );
  row.monthlyVolumeAllMs = measure(() => {
    for (let i = 11; i >= 0; i--) {
      const start = dayjs().subtract(i, 'month').startOf('month'),
        end = dayjs().subtract(i, 'month').endOf('month');
      let volume = 0;
      for (const activity of data) {
        const date = dayjs(activity.date);
        if (
          date.isAfter(start.subtract(1, 'day')) &&
          date.isBefore(end.add(1, 'day')) &&
          activity.completed &&
          activity.sets
        )
          for (const set of activity.sets)
            if (set.completed && set.weight && set.reps)
              volume += set.weight * set.reps;
      }
    }
  });
  row.optimizedMonthlyVolumeMs = measure(() =>
    stats.calculateVolumeBuckets(data, 0)
  );
  row.optimizedTopExercisesMs = measure(() =>
    stats.calculateTopExercises(data)
  );
  results.push(row);
  console.log(JSON.stringify(row));
}
fs.writeFileSync(
  path.join(__dirname, '../docs/performance-results.json'),
  JSON.stringify(
    {
      runtime: process.version,
      platform: process.platform,
      arch: process.arch,
      method:
        'Warm-up + median of five iterations. Synthetic records; Node CPU timings, not Hermes/device/UI measurements. No disk or network timing.',
      results,
    },
    null,
    2
  )
);
