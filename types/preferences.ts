export type WeekStartDay = 0 | 1; // 0 = Sunday, 1 = Monday

export interface UserPreferences {
  firstDayOfWeek: WeekStartDay;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  firstDayOfWeek: 1, // Monday (matches current behavior)
};
