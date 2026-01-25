import dayjs, { Dayjs } from 'dayjs';

/**
 * Get the Monday of the week containing the given date.
 * Uses Monday-Sunday week model (not Sunday-Saturday).
 *
 * @param date - The reference date (defaults to today)
 * @returns Dayjs object representing Monday of that week at start of day
 */
export function getMondayOfWeek(date: Dayjs = dayjs()): Dayjs {
  const dayOfWeek = date.day(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // Sunday (0) -> go back 6 days, Monday (1) -> go back 0 days, Tuesday (2) -> go back 1 day, etc.
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return date.subtract(daysToSubtract, 'day').startOf('day');
}

/**
 * Get the Monday of a week relative to the current week.
 *
 * @param weekOffset - Number of weeks from current week (0 = this week, -1 = last week, 1 = next week)
 * @returns Dayjs object representing Monday of that week
 */
export function getMondayOfWeekByOffset(weekOffset: number = 0): Dayjs {
  const targetDate = dayjs().add(weekOffset * 7, 'day');
  return getMondayOfWeek(targetDate);
}

/**
 * Get the Sunday (end) of the week containing the given date.
 *
 * @param date - The reference date (defaults to today)
 * @returns Dayjs object representing Sunday of that week
 */
export function getSundayOfWeek(date: Dayjs = dayjs()): Dayjs {
  return getMondayOfWeek(date).add(6, 'day');
}
