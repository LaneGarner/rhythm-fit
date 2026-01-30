import dayjs, { Dayjs } from 'dayjs';
import { useMemo } from 'react';
import { usePreferences } from '../context/PreferencesContext';
import {
  getWeekStart,
  getWeekEnd,
  getWeekStartByOffset,
} from '../utils/dateUtils';

export function useWeekBoundaries() {
  const { firstDayOfWeek } = usePreferences();

  return useMemo(
    () => ({
      getWeekStart: (date: Dayjs = dayjs()) =>
        getWeekStart(date, firstDayOfWeek),
      getWeekEnd: (date: Dayjs = dayjs()) => getWeekEnd(date, firstDayOfWeek),
      getWeekStartByOffset: (weekOffset: number = 0) =>
        getWeekStartByOffset(weekOffset, firstDayOfWeek),
      firstDayOfWeek,
    }),
    [firstDayOfWeek]
  );
}
