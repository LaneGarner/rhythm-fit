export type ActivityType =
  | 'weight-training'
  | 'calisthenics'
  | 'cardio'
  | 'mobility'
  | 'recovery'
  | 'sports'
  | 'other';

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
  recurring?: RecurringConfig; // Add this field
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
