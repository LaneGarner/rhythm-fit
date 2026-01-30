import dayjs, { Dayjs } from 'dayjs';
import { WeekStartDay } from '../types/preferences';

/**
 * Get the first day of the week containing the given date.
 *
 * @param date - The reference date (defaults to today)
 * @param firstDayOfWeek - 0 for Sunday, 1 for Monday (defaults to Monday)
 * @returns Dayjs object representing the first day of that week at start of day
 */
export function getWeekStart(
  date: Dayjs = dayjs(),
  firstDayOfWeek: WeekStartDay = 1
): Dayjs {
  const dayOfWeek = date.day(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  if (firstDayOfWeek === 0) {
    // Sunday start: Sunday (0) -> go back 0 days, Monday (1) -> go back 1 day, etc.
    return date.subtract(dayOfWeek, 'day').startOf('day');
  } else {
    // Monday start: Sunday (0) -> go back 6 days, Monday (1) -> go back 0 days, etc.
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return date.subtract(daysToSubtract, 'day').startOf('day');
  }
}

/**
 * Get the Monday of the week containing the given date.
 * Uses Monday-Sunday week model (not Sunday-Saturday).
 *
 * @param date - The reference date (defaults to today)
 * @returns Dayjs object representing Monday of that week at start of day
 * @deprecated Use getWeekStart with firstDayOfWeek parameter instead
 */
export function getMondayOfWeek(date: Dayjs = dayjs()): Dayjs {
  return getWeekStart(date, 1);
}

/**
 * Get the first day of a week relative to the current week.
 *
 * @param weekOffset - Number of weeks from current week (0 = this week, -1 = last week, 1 = next week)
 * @param firstDayOfWeek - 0 for Sunday, 1 for Monday (defaults to Monday)
 * @returns Dayjs object representing the first day of that week
 */
export function getWeekStartByOffset(
  weekOffset: number = 0,
  firstDayOfWeek: WeekStartDay = 1
): Dayjs {
  const targetDate = dayjs().add(weekOffset * 7, 'day');
  return getWeekStart(targetDate, firstDayOfWeek);
}

/**
 * Get the Monday of a week relative to the current week.
 *
 * @param weekOffset - Number of weeks from current week (0 = this week, -1 = last week, 1 = next week)
 * @returns Dayjs object representing Monday of that week
 * @deprecated Use getWeekStartByOffset with firstDayOfWeek parameter instead
 */
export function getMondayOfWeekByOffset(weekOffset: number = 0): Dayjs {
  return getWeekStartByOffset(weekOffset, 1);
}

/**
 * Get the last day of the week containing the given date.
 *
 * @param date - The reference date (defaults to today)
 * @param firstDayOfWeek - 0 for Sunday, 1 for Monday (defaults to Monday)
 * @returns Dayjs object representing the last day of that week
 */
export function getWeekEnd(
  date: Dayjs = dayjs(),
  firstDayOfWeek: WeekStartDay = 1
): Dayjs {
  return getWeekStart(date, firstDayOfWeek).add(6, 'day');
}

/**
 * Get the Sunday (end) of the week containing the given date.
 *
 * @param date - The reference date (defaults to today)
 * @returns Dayjs object representing Sunday of that week
 * @deprecated Use getWeekEnd with firstDayOfWeek parameter instead
 */
export function getSundayOfWeek(date: Dayjs = dayjs()): Dayjs {
  return getWeekEnd(date, 1);
}
