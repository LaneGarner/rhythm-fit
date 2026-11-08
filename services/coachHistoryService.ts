import { Activity } from '../types/activity';

export interface HistoryQuery {
  exercise?: string;
  exercises?: string[];
  all?: boolean;
  from?: string;
  to?: string;
  offset?: number;
}

// Identity cache follows Redux's immutable activity array; edits invalidate it.
const summaries = new WeakMap<Activity[], string>();
export function buildHistoryOverview(activities: Activity[]): string {
  const cached = summaries.get(activities);
  if (cached) return cached;
  const counts = new Map<string, number>();
  let first = '',
    last = '',
    sets = 0,
    completed = 0;
  for (const a of activities) {
    if ((a as any).deleted_at) continue;
    if (a.date && (!first || a.date < first)) first = a.date;
    if (a.date > last) last = a.date;
    completed += Number(a.completed);
    sets += a.sets?.length || 0;
    counts.set(a.name, (counts.get(a.name) || 0) + 1);
  }
  const exercises = [...counts].sort((a, b) => b[1] - a[1]);
  const result = JSON.stringify({
    source:
      'Current phone records, including unsynced changes; not proof of cloud backup.',
    firstDate: first || null,
    lastDate: last || null,
    activities: [...counts.values()].reduce((a, b) => a + b, 0),
    completed,
    sets,
    exercises: exercises.slice(0, 100),
    omittedExerciseNames: Math.max(0, exercises.length - 100),
  });
  summaries.set(activities, result);
  return result;
}

export function lookupWorkoutHistory(
  activities: Activity[],
  query: HistoryQuery
) {
  const exercise =
    typeof query.exercise === 'string'
      ? query.exercise.trim().toLowerCase()
      : '';
  const exerciseNames = Array.isArray(query.exercises)
    ? query.exercises
        .filter((n): n is string => typeof n === 'string')
        .map(n => n.trim().toLowerCase())
        .filter(Boolean)
    : [];
  if (exercise) exerciseNames.push(exercise);
  const validDate = (s: unknown): s is string =>
    typeof s === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s;
  if (
    (query.from && !validDate(query.from)) ||
    (query.to && !validDate(query.to)) ||
    (query.from && query.to && query.from > query.to)
  )
    return { error: 'Invalid date range' };
  const matching = activities
    .filter(
      a =>
        !(a as any).deleted_at &&
        (!exerciseNames.length ||
          exerciseNames.some(name => a.name.toLowerCase().includes(name))) &&
        (!query.from || a.date >= query.from) &&
        (!query.to || a.date <= query.to)
    )
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  if (query.all === true)
    return {
      query,
      complete: true,
      totalActivities: matching.length,
      totalSets: matching.reduce((sum, a) => sum + (a.sets?.length || 0), 0),
      firstDate: matching.at(-1)?.date || null,
      lastDate: matching[0]?.date || null,
      records: matching,
      nextOffset: null,
      source:
        'All matching current phone records, including unsynced data. Not proof of cloud backup.',
    };
  const offset =
    Number.isInteger(query.offset) && query.offset! >= 0 ? query.offset! : 0;
  // Budget is explicit; never imply a page represents the whole history.
  const records: unknown[] = [];
  let size = 0;
  for (const a of matching.slice(offset, offset + 20)) {
    const record = {
      ...a,
      notes: a.notes?.slice(0, 2000),
      sets: a.sets
        ?.slice(0, 100)
        .map(s => ({ ...s, notes: s.notes?.slice(0, 1000) })),
      omittedSets: Math.max(0, (a.sets?.length || 0) - 100),
      notesTruncated:
        (a.notes?.length || 0) > 2000 ||
        !!a.sets?.some(s => (s.notes?.length || 0) > 1000),
    };
    while (JSON.stringify(record).length > 12000 && record.sets?.length) {
      record.sets.pop();
      record.omittedSets++;
    }
    const bytes = JSON.stringify(record).length;
    if (size + bytes > 40000) break;
    records.push(record);
    size += bytes;
  }
  let completedSets = 0,
    totalSets = 0,
    maxWeight: number | null = null;
  const yearly: Record<
    string,
    { completedSets: number; volumeLbReps: number; maxWeightLb: number | null }
  > = {};
  for (const a of matching)
    for (const s of a.sets || []) {
      totalSets++;
      if (s.completed) {
        completedSets++;
        const entry = (yearly[a.date.slice(0, 4)] ||= {
          completedSets: 0,
          volumeLbReps: 0,
          maxWeightLb: null,
        });
        entry.completedSets++;
        if (typeof s.weight === 'number') {
          entry.maxWeightLb = Math.max(entry.maxWeightLb ?? s.weight, s.weight);
          if (typeof s.reps === 'number')
            entry.volumeLbReps += s.weight * s.reps;
        }
      }
      if (s.completed && typeof s.weight === 'number')
        maxWeight = Math.max(maxWeight ?? s.weight, s.weight);
    }
  return {
    query,
    yearly,
    totalActivities: matching.length,
    totalSets,
    completedSets,
    maxCompletedWeightLb: maxWeight,
    firstDate: matching.at(-1)?.date || null,
    lastDate: matching[0]?.date || null,
    offset,
    records,
    nextOffset:
      offset + records.length < matching.length
        ? offset + records.length
        : null,
    units: 'weight: lb; time: seconds; distance: stored app units',
  };
}
