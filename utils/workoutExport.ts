import type { Activity, SetData } from '../types/activity';

export type ExportFormat = 'json' | 'csv' | 'text';
export type ExportRange =
  | { type: 'all' }
  | { type: 'dates'; from: string; to: string };
export type ExportActivity = Activity & {
  deleted_at?: string;
  [key: string]: unknown;
};
export interface WorkoutBackupData {
  accountId: string | null;
  activities: ExportActivity[];
  pending: ExportActivity[];
  preSyncSnapshot: {
    activities?: ExportActivity[];
    pending?: ExportActivity[];
    [key: string]: unknown;
  } | null;
}
export function validExportDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return (
    Number.isFinite(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}
export function selectWorkoutData(
  source: WorkoutBackupData,
  range: ExportRange
): WorkoutBackupData {
  if (range.type === 'all') return source;
  if (
    !validExportDate(range.from) ||
    !validExportDate(range.to) ||
    range.from > range.to
  )
    throw new Error('Choose an end date on or after the start date.');
  const matches = (a: ExportActivity) =>
    typeof a.date === 'string' && a.date >= range.from && a.date <= range.to;
  const selectedIds = new Set(
    [...source.activities, ...(source.preSyncSnapshot?.activities || [])]
      .filter(matches)
      .map(a => a.id)
  );
  const filter = (rows: ExportActivity[]) =>
    rows.filter(a => matches(a) || (!a.date && selectedIds.has(a.id)));
  return {
    ...source,
    activities: filter(source.activities),
    pending: filter(source.pending),
    preSyncSnapshot: source.preSyncSnapshot
      ? {
          ...source.preSyncSnapshot,
          ...(source.preSyncSnapshot.activities && {
            activities: filter(source.preSyncSnapshot.activities),
          }),
          ...(source.preSyncSnapshot.pending && {
            pending: filter(source.preSyncSnapshot.pending),
          }),
        }
      : null,
  };
}
export function workoutExportSummary(source: WorkoutBackupData) {
  const dates = source.activities
    .map(a => a.date)
    .filter(d => typeof d === 'string' && validExportDate(d))
    .sort();
  return {
    activities: source.activities.length,
    sets: source.activities.reduce((n, a) => n + (a.sets?.length || 0), 0),
    days: new Set(dates).size,
    earliest: dates[0] || null,
    latest: dates.at(-1) || null,
    pending: source.pending.length,
    recoveryActivities: source.preSyncSnapshot?.activities?.length || 0,
  };
}
function csvCell(value: unknown): string {
  if (value == null) return '""';
  let text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  // A spreadsheet must treat user-written notes/names as text, never formulas.
  if (
    typeof value === 'string' &&
    (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text))
  )
    text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
const activityFields = new Set([
  'id',
  'date',
  'type',
  'name',
  'completed',
  'notes',
  'sets',
  'updated_at',
  'deleted_at',
  'supersetId',
  'supersetPosition',
  'order',
  'trackingFields',
  'recurring',
  'restTimerEnabled',
]);
const setFields = new Set([
  'id',
  'completed',
  'weight',
  'reps',
  'time',
  'distance',
  'band',
  'notes',
]);
const extras = (object: object, keys: Set<string>) =>
  Object.fromEntries(Object.entries(object).filter(([key]) => !keys.has(key)));
export function createWorkoutExport(
  source: WorkoutBackupData,
  range: ExportRange,
  format: ExportFormat
) {
  const selected = selectWorkoutData(source, range);
  const summary = workoutExportSummary(selected);
  if (format === 'json')
    return {
      extension: 'json',
      mimeType: 'application/json',
      uti: 'public.json',
      summary,
      contents: JSON.stringify(
        {
          format: 'rhythm-workout-backup',
          version: 2,
          exportedAt: new Date().toISOString(),
          scope: range,
          summary,
          ...selected,
        },
        null,
        2
      ),
    };
  const activities = [...selected.activities].sort(
    (a, b) =>
      (a.date || '').localeCompare(b.date || '') ||
      (a.order ?? 0) - (b.order ?? 0)
  );
  if (format === 'csv') {
    const rows: unknown[][] = [
      [
        'activity_id',
        'date',
        'activity_type',
        'exercise',
        'activity_completed',
        'activity_notes',
        'updated_at',
        'deleted_at',
        'superset_id',
        'superset_position',
        'order',
        'tracking_fields',
        'recurring',
        'rest_timer_enabled',
        'set_number',
        'set_id',
        'set_completed',
        'weight_lb',
        'reps',
        'time_seconds',
        'distance',
        'band',
        'set_notes',
        'activity_extra_json',
        'set_extra_json',
      ],
    ];
    for (const a of activities)
      for (const [index, set] of (a.sets?.length ? a.sets : [null]).entries())
        rows.push([
          a.id,
          a.date,
          a.type,
          a.name,
          a.completed,
          a.notes,
          a.updated_at,
          a.deleted_at,
          a.supersetId,
          a.supersetPosition,
          a.order,
          a.trackingFields,
          a.recurring,
          a.restTimerEnabled,
          set ? index + 1 : null,
          set?.id,
          set?.completed,
          set?.weight,
          set?.reps,
          set?.time,
          set?.distance,
          set?.band,
          set?.notes,
          extras(a, activityFields),
          set ? extras(set, setFields) : null,
        ]);
    return {
      extension: 'csv',
      mimeType: 'text/csv',
      uti: 'public.comma-separated-values-text',
      summary,
      contents:
        '\uFEFF' +
        rows.map(row => row.map(csvCell).join(',')).join('\r\n') +
        '\r\n',
    };
  }
  const lines = [
    'Rhythm workout log',
    `${summary.days} workout days · ${summary.activities} activities · ${summary.sets} sets`,
    range.type === 'all' ? 'All history' : `${range.from} through ${range.to}`,
    '',
  ];
  for (const a of activities) {
    lines.push(
      `${a.date || 'Undated'} — ${a.name} (${a.type})`,
      a.deleted_at ? 'Deleted' : a.completed ? 'Complete' : 'Incomplete'
    );
    if (a.supersetId) lines.push(`Superset: ${a.supersetId}`);
    if (a.notes) lines.push(`Notes: ${a.notes}`);
    if (!a.sets?.length) lines.push('No sets recorded.');
    a.sets?.forEach((set: SetData, index: number) => {
      const values = [
        set.weight != null ? `${set.weight} lb` : null,
        set.reps != null ? `${set.reps} reps` : null,
        set.time != null ? `${set.time} seconds` : null,
        set.distance != null ? `Distance: ${set.distance}` : null,
        set.band ? `Band: ${set.band}` : null,
      ].filter(Boolean);
      lines.push(
        `Set ${index + 1}: ${values.join(' · ') || 'No measurements'} — ${set.completed ? 'complete' : 'incomplete'}`
      );
      if (set.notes) lines.push(`  Notes: ${set.notes}`);
    });
    lines.push('');
  }
  return {
    extension: 'txt',
    mimeType: 'text/plain',
    uti: 'public.plain-text',
    summary,
    contents: lines.join('\n'),
  };
}
