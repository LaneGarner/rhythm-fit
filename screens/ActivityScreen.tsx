import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import React from 'react';

dayjs.extend(isSameOrAfter);
import { useDispatch } from 'react-redux';
import ActivityForm from '../components/ActivityForm';
import { addActivity } from '../redux/activitySlice';
import { Activity, RecurringConfig } from '../types/activity';

export default function ActivityScreen({ navigation, route }: any) {
  const { date } = route.params || {};
  const dispatch = useDispatch();

  const createRecurringActivities = (
    baseActivity: Activity,
    config: RecurringConfig
  ): Activity[] => {
    const activities: Activity[] = [];

    if (config.pattern === 'daily') {
      for (let i = 0; i < config.occurrences!; i++) {
        const activityDate = dayjs(config.startDate).add(i, 'day');
        activities.push({
          ...baseActivity,
          id: `${baseActivity.id}_${i}`,
          date: activityDate.format('YYYY-MM-DD'),
          recurring: config,
        });
      }
    } else if (config.pattern === 'weekly') {
      if (config.frequency === 'this') {
        // Create one activity per selected day for this week only
        const start = dayjs(config.startDate);
        (config.daysOfWeek || []).forEach((dow, i) => {
          // Find the date for this week's 'dow' (0=Sunday...6=Saturday)
          const date = start.day(dow);
          activities.push({
            ...baseActivity,
            id: `${baseActivity.id}_${i}`,
            date: date.format('YYYY-MM-DD'),
            recurring: config,
          });
        });
      } else {
        // "every" frequency - occurrences now means weeks
        // For each week, create activities for ALL selectedDays
        const weeks = config.occurrences || 1;
        const startDateObj = dayjs(config.startDate);
        let activityIndex = 0;

        for (let week = 0; week < weeks; week++) {
          for (const dayOfWeek of config.daysOfWeek || []) {
            // Find the date for this dayOfWeek in this week
            const weekStart = startDateObj.add(week, 'week').startOf('week');
            const activityDate = weekStart.day(dayOfWeek);

            // Only include if date is >= startDate
            if (activityDate.isSameOrAfter(startDateObj, 'day')) {
              activities.push({
                ...baseActivity,
                id: `${baseActivity.id}_${activityIndex}`,
                date: activityDate.format('YYYY-MM-DD'),
                recurring: config,
              });
              activityIndex++;
            }
          }
        }
      }
    }

    return activities;
  };

  const handleSave = (
    activity: Activity,
    recurringConfig?: RecurringConfig
  ) => {
    if (recurringConfig) {
      const recurringActivities = createRecurringActivities(
        activity,
        recurringConfig
      );
      recurringActivities.forEach(activity => {
        dispatch(addActivity(activity));
      });
    } else {
      dispatch(addActivity(activity));
    }

    navigation.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  // Pass the date from route params so the activity defaults to that day
  const initialActivity = date ? ({ date } as any) : undefined;

  return (
    <ActivityForm
      mode="create"
      initialActivity={initialActivity}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
