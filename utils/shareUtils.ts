import {
  Activity,
  DEFAULT_TRACKING_FIELDS,
  SetData,
  TrackingField,
} from '../types/activity';
import { secondsToTimeString } from './timeFormat';

export function formatSetCompact(
  set: SetData,
  trackingFields: TrackingField[]
): string {
  const parts: string[] = [];
  const hasWeight =
    trackingFields.includes('weight') && set.weight && set.weight > 0;
  const hasReps =
    trackingFields.includes('reps') && set.reps && set.reps > 0;
  const hasTime =
    trackingFields.includes('time') && set.time && set.time > 0;
  const hasDistance =
    trackingFields.includes('distance') && set.distance && set.distance > 0;

  if (hasWeight && hasReps) {
    parts.push(`${set.weight}\u00D7${set.reps}`);
  } else {
    if (hasWeight) parts.push(`${set.weight} lbs`);
    if (hasReps) parts.push(`${set.reps} reps`);
  }

  if (hasTime) parts.push(secondsToTimeString(set.time));
  if (hasDistance) parts.push(`${set.distance} mi`);

  return parts.join(', ');
}

export function formatActivitySetsSummary(activity: Activity): string {
  const sets = activity.sets;
  if (!sets || sets.length === 0) return '';

  const trackingFields =
    activity.trackingFields || DEFAULT_TRACKING_FIELDS[activity.type];

  const formatted = sets
    .map(set => formatSetCompact(set, trackingFields))
    .filter(s => s.length > 0);

  if (formatted.length === 0) return '';

  if (formatted.length === 1) return formatted[0];

  return `${formatted.length} sets \u00B7 ${formatted.join(', ')}`;
}
