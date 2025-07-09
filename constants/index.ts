export const ACTIVITY_EMOJIS = {
  'weight-training': '🏋️',
  bodyweight: '💪',
  cardio: '🏃',
  mobility: '🧘',
  recovery: '🛌',
  sports: '⚽',
  other: '🎯',
  sauna: '🛁',
  'cold-plunge': '🧊',
  yoga: '🧘',
  meditation: '🧘‍♀️',
  golf: '⛳',
  basketball: '🏀',
} as const;

export const ACTIVITY_TYPES = [
  { value: 'weight-training', label: 'Weight Training', emoji: '🏋️' },
  { value: 'bodyweight', label: 'Bodyweight', emoji: '💪' },
  { value: 'cardio', label: 'Cardio', emoji: '🏃' },
  { value: 'mobility', label: 'Mobility', emoji: '🧘' },
  { value: 'recovery', label: 'Recovery', emoji: '🛌' },
  { value: 'sports', label: 'Sports', emoji: '⚽' },
  { value: 'yoga', label: 'Yoga', emoji: '🧘' },
  { value: 'meditation', label: 'Meditation', emoji: '🧘‍♀️' },
  { value: 'golf', label: 'Golf', emoji: '⛳' },
  { value: 'basketball', label: 'Basketball', emoji: '🏀' },
  { value: 'sauna', label: 'Sauna', emoji: '🛁' },
  { value: 'cold-plunge', label: 'Cold Plunge', emoji: '🧊' },
  { value: 'other', label: 'Other', emoji: '🎯' },
] as const;

export const EXERCISE_CATEGORIES = [
  'Push',
  'Pull',
  'Legs',
  'Core',
  'Full Body',
  'Custom',
] as const;

export const COLORS = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  background: '#F2F2F7',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#8E8E93',
} as const;

export const HEADER_STYLES =
  'pt-16 pb-4 px-4 bg-white border-b border-gray-200 flex-row items-center';
