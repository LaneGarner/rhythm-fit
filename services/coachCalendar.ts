import dayjs from 'dayjs';
import * as Crypto from 'expo-crypto';
import type { Activity, SetData } from '../types/activity';

export interface CalendarPatch {
  before: Activity[];
  after: Activity[];
  preview: string[];
}

const validDate = (date: unknown): date is string =>
  typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  dayjs(date).format('YYYY-MM-DD') === date;

const metrics = ['reps', 'weight', 'time', 'distance'] as const;

export function previewCoachCalendar(
  proposal: unknown,
  calendar: Activity[],
  candidates: ReadonlySet<string>
): CalendarPatch | undefined {
  if (!Array.isArray(proposal) || !proposal.length || proposal.length > 30) return;
  const before = new Map<string, Activity>();
  const after = new Map<string, Activity>();
  const preview: string[] = [];
  const copies = new Set<string>();

  for (const operation of proposal) {
    if (!operation || typeof operation !== 'object') return;
    const { action, date, days, name, sets, sourceStart, sourceEnd } = operation;
    let { ids } = operation;
    if (sourceStart !== undefined || sourceEnd !== undefined) {
      if (action !== 'copy' || ids !== undefined ||
          !validDate(sourceStart) || !validDate(sourceEnd) ||
          sourceStart > sourceEnd || dayjs(sourceEnd).diff(sourceStart, 'day') > 31) return;
      ids = calendar.filter(activity => activity.date >= sourceStart && activity.date <= sourceEnd)
        .map(activity => activity.id);
    }
    if (!Array.isArray(ids) || !ids.length || ids.length > 200 ||
        ids.some((id: unknown) => typeof id !== 'string' || !candidates.has(id))) return;
    const selected = new Set(ids);
    const source = calendar.filter(activity => selected.has(activity.id));
    if (source.length !== selected.size) return;
    if (['move', 'copy', 'remove'].includes(action)) {
      const groups = new Set(source.map(activity => activity.supersetId).filter(Boolean));
      for (const member of calendar) {
        if (member.supersetId && groups.has(member.supersetId) && !selected.has(member.id)) {
          if (!candidates.has(member.id)) return;
          source.push(member);
        }
      }
    }

    if (action === 'move' || action === 'copy') {
      if (date !== undefined ? !validDate(date) || new Set(source.map(a => a.date)).size !== 1
        : !Number.isInteger(days) || Math.abs(days) > 366 || days === 0) return;
    }
    if (action === 'replace' && (typeof name !== 'string' || !name.trim() || name.length > 100)) return;
    if (action === 'sets' || (action === 'replace' && sets !== undefined)) {
      if (!Array.isArray(sets) || !sets.length || sets.length > 30 ||
          sets.some(set => !set || typeof set !== 'object' ||
            !metrics.some(key => set[key] !== undefined) ||
            metrics.some(key => set[key] !== undefined &&
              (!Number.isFinite(set[key]) || set[key] < 0 || set[key] > 86400)))) return;
    }

    const groups = new Map<string, string>();
    for (const activity of source) {
      if (action !== 'copy' && (activity.completed || before.has(activity.id) ||
        ((action === 'remove' || action === 'replace') && activity.sets?.some(set => set.completed)))) return;
      const destination = date ?? (days === undefined ? activity.date : dayjs(activity.date).add(days, 'day').format('YYYY-MM-DD'));
      if (action === 'copy') {
        const key = JSON.stringify([activity.id, destination]);
        if (!validDate(destination) || destination === activity.date) return;
        if (copies.has(key)) continue;
        copies.add(key);
        let supersetId: string | undefined;
        if (activity.supersetId) {
          supersetId = groups.get(activity.supersetId) ?? Crypto.randomUUID();
          groups.set(activity.supersetId, supersetId);
        }
        const copy = { ...activity, id: Crypto.randomUUID(), date: destination, completed: false,
          recurring: undefined, supersetId,
          sets: activity.sets?.map(set => ({ ...set, id: Crypto.randomUUID(), completed: false, notes: undefined })) };
        after.set(copy.id, copy);
        preview.push(`Copy ${activity.name} from ${activity.date} to ${destination}`);
        continue;
      }

      if (activity.recurring && action === 'move') return;
      before.set(activity.id, activity);
      if (action === 'move') {
        if (!validDate(destination) || destination === activity.date) return;
        after.set(activity.id, { ...activity, date: destination });
        preview.push(`Move ${activity.name} from ${activity.date} to ${destination}`);
      } else if (action === 'remove') {
        preview.push(`Remove ${activity.name} on ${activity.date}`);
      } else if (action === 'replace' || action === 'sets') {
        const planned: SetData[] = (sets ?? []).map((set: Record<string, number>) => ({
          id: Crypto.randomUUID(), completed: false,
          ...Object.fromEntries(metrics.filter(key => set[key] !== undefined).map(key => [key, set[key]])),
        }));
        const existingSets = activity.sets ?? [];
        const logged = existingSets.filter(set => set.completed);
        const updated = action === 'replace'
          ? { ...activity, name: name.trim(), sets: sets ? planned : existingSets }
          : { ...activity, sets: [...logged, ...planned] };
        after.set(activity.id, updated);
        const targets = planned.map(set => metrics.filter(key => set[key] !== undefined)
          .map(key => `${set[key]} ${key === 'time' ? 'sec' : key}`).join(', ')).join(' / ');
        preview.push(action === 'replace'
          ? `Replace ${activity.name} with ${updated.name} on ${activity.date}${targets ? ` (${targets})` : ''}`
          : `Set ${activity.name} on ${activity.date} to ${targets}${logged.length ? ' (logged sets kept)' : ''}`);
      } else return;
    }
  }

  return { before: [...before.values()], after: [...after.values()], preview };
}
