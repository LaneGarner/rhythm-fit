export type ActivityType =
  | 'weight-training'
  | 'bodyweight'
  | 'cardio'
  | 'mobility'
  | 'recovery'
  | 'sports'
  | 'yoga'
  | 'meditation'
  | 'golf'
  | 'basketball'
  | 'sauna'
  | 'cold-plunge'
  | 'other';

export interface Activity {
  id: string;
  date: string;
  type: ActivityType;
  name: string;
  emoji?: string;
  completed: boolean;
  notes?: string;
  sets?: SetData[];
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
