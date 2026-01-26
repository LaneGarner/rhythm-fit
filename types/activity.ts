export type ActivityType =
  | 'weight-training'
  | 'calisthenics'
  | 'cardio'
  | 'mobility'
  | 'recovery'
  | 'sports'
  | 'other';

export type TrackingField = 'weight' | 'reps' | 'time' | 'distance';

export const DEFAULT_TRACKING_FIELDS: Record<ActivityType, TrackingField[]> = {
  'weight-training': ['weight', 'reps'],
  calisthenics: ['reps', 'weight', 'time'],
  cardio: ['time', 'distance'],
  mobility: ['time', 'reps'],
  recovery: ['time', 'reps'],
  sports: ['time', 'reps'],
  other: ['reps', 'time'],
};

export type RecurringPattern = 'daily' | 'weekly' | 'custom';
export type RecurringFrequency = 'every' | 'this'; // for "this Monday" vs "every Monday"

export interface RecurringConfig {
  pattern: RecurringPattern;
  frequency: RecurringFrequency;
  daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc.
  startDate: string;
  endDate?: string;
  occurrences?: number; // number of times to repeat
}

export interface Activity {
  id: string;
  date: string;
  type: ActivityType;
  name: string;
  emoji?: string;
  completed: boolean;
  notes?: string;
  sets?: SetData[];
  recurring?: RecurringConfig;
  updated_at?: string; // ISO timestamp for sync
  order?: number; // Custom sort order for manual reordering
  trackingFields?: TrackingField[]; // Fields to show for sets
  supersetId?: string; // Shared ID between grouped activities in a superset
  supersetPosition?: number; // 1, 2, 3... for ordering within the superset
}

export interface SetData {
  id: string;
  reps?: number;
  weight?: number;
  time?: number; // in seconds
  distance?: number; // in miles/km
  notes?: string; // optional set-level notes
  completed: boolean;
}
