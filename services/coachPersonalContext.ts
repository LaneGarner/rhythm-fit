import type { Activity } from '../types/activity';
import type { CoachProfile } from '../types/coachProfile';
import type { EquipmentConfig } from './equipmentService';

export function buildCoachPersonalContext(
  profile: CoachProfile | null,
  equipment: EquipmentConfig | null,
  activities: Activity[],
  today: string
): string {
  const saved = activities.filter(a => !(a as any).deleted_at);
  const planned = saved.filter(a => !a.completed && a.date >= today);
  const dates = planned.map(a => a.date).sort();
  return JSON.stringify({
    coachProfile: profile,
    profileMeaning:
      'Self-reported saved preferences, not proof of current fitness or medical status. Missing fields are unknown. Historical planWeeks/startThisWeek describe onboarding, not a new instruction to schedule a plan.',
    equipmentInventory: equipment,
    equipmentMeaning: equipment
      ? 'Saved plate-calculator configuration; weights are pounds and plate counts are individual plates. Selected barbell is the calculator selection. This may include previously saved defaults; confirm availability if it conflicts with the Coach profile. Do not infer ownership of other equipment.'
      : 'No readable saved inventory. Do not infer that the user owns the calculator default bars or plates, or that they have no equipment.',
    schedule: {
      asOf: today,
      plannedActivities: planned.length,
      firstPlannedDate: dates[0] || null,
      lastPlannedDate: dates.at(-1) || null,
      pastIncompleteActivities: saved.filter(
        a => !a.completed && a.date < today
      ).length,
      recurringActivities: saved.filter(a => !!a.recurring).length,
      access:
        'Use lookup_workout_history with status=planned for upcoming unfinished work, or incomplete for all unfinished work. Combine dates and exercises; all=true retrieves every matching record including recurrence, sets, notes, order and supersets. No future schedule horizon is imposed.',
      interpretation:
        'Scheduled and incomplete work is not completed performance. Past incomplete records may be partially done or unlogged, not necessarily skipped. Recurrence settings are metadata; do not invent occurrences that are not saved.',
    },
  });
}
