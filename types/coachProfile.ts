import { ActivityType } from './activity';

// Equipment categories. These mirror the per-exercise `equipmentRequired` tags
// in the backend exercise database (rhythm-backend/lib/exercises.ts) so a plan
// can be filtered to only the gear a user actually has.
export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'cable'
  | 'machine'
  | 'bands'
  | 'cardio-machine'
  | 'bodyweight';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

// Optional, self-reported. Used only to tailor recovery, volume, and exercise
// emphasis in generated plans. 'unspecified' is the explicit "prefer not to
// say" value and applies no sex-specific adjustments.
export type Sex = 'female' | 'male' | 'unspecified';

// The answers gathered during onboarding, used to generate and schedule a plan.
// Persisted as one JSONB blob on profiles.coach_profile and cached locally.
export interface CoachProfile {
  goals: string[];
  experience: ExperienceLevel;
  // Optional. Omitted or 'unspecified' means no sex-specific tailoring.
  sex?: Sex;
  daysPerWeek: number;
  sessionLengthMin: number;
  // How many weeks the generated plan should span (the base week repeats).
  planWeeks: number;
  // When true, the plan is anchored to today (a workout lands today) instead of
  // waiting for the upcoming Monday.
  startThisWeek: boolean;
  // null means the equipment step was skipped: no filtering, anything is on the
  // table. An empty array would mean "no equipment selected" and is avoided.
  equipment: Equipment[] | null;
  injuries: string;
  preferredActivityTypes: ActivityType[];
  // Free-text from the conversational refinement step ("anything else?").
  notes?: string;
}

export type Goal =
  | 'build_muscle'
  | 'lose_fat'
  | 'get_stronger'
  | 'improve_endurance'
  | 'mobility'
  | 'general_health';

export const GOAL_LABELS: Record<Goal, string> = {
  build_muscle: 'Build muscle',
  lose_fat: 'Lose fat',
  get_stronger: 'Get stronger',
  improve_endurance: 'Improve endurance',
  mobility: 'Mobility & flexibility',
  general_health: 'General health',
};

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const SEX_LABELS: Record<Sex, string> = {
  female: 'Female',
  male: 'Male',
  unspecified: 'Prefer not to say',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  kettlebell: 'Kettlebell',
  cable: 'Cable',
  machine: 'Machine',
  bands: 'Bands',
  'cardio-machine': 'Cardio machine',
  bodyweight: 'Bodyweight',
};

// Friendly access presets shown in the onboarding equipment step. Each expands
// to the set of equipment tags the AI is allowed to program for. `null` is the
// explicit "skip" value (no filtering).
export interface EquipmentPreset {
  id: string;
  label: string;
  equipment: Equipment[];
}

export const EQUIPMENT_PRESETS: EquipmentPreset[] = [
  {
    id: 'full_gym',
    label: 'Full gym',
    equipment: [
      'barbell',
      'dumbbell',
      'kettlebell',
      'cable',
      'machine',
      'bands',
      'cardio-machine',
      'bodyweight',
    ],
  },
  {
    id: 'dumbbells_only',
    label: 'Dumbbells only',
    equipment: ['dumbbell', 'bodyweight'],
  },
  {
    id: 'barbell_rack',
    label: 'Barbell + rack',
    equipment: ['barbell', 'bodyweight'],
  },
  {
    id: 'bodyweight_only',
    label: 'Bodyweight only',
    equipment: ['bodyweight'],
  },
  {
    id: 'bands',
    label: 'Resistance bands',
    equipment: ['bands', 'bodyweight'],
  },
  {
    id: 'kettlebells',
    label: 'Kettlebells',
    equipment: ['kettlebell', 'bodyweight'],
  },
];

// Session length options offered in onboarding (minutes).
export const SESSION_LENGTH_OPTIONS = [30, 45, 60, 90];

// Plan-length options offered in onboarding (weeks).
export const PLAN_WEEK_OPTIONS = [2, 4, 6, 8];
export const DEFAULT_PLAN_WEEKS = 4;

// Days-per-week bounds offered in onboarding.
export const MIN_DAYS_PER_WEEK = 2;
export const MAX_DAYS_PER_WEEK = 6;
