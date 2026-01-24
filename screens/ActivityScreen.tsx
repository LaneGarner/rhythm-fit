import dayjs from 'dayjs';
import React from 'react';
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
        // ... existing logic for 'every'
        let occurrenceCount = 0;
        let currentDate = dayjs(config.startDate);
        while (occurrenceCount < config.occurrences!) {
          const dayOfWeek = currentDate.day();
          if (config.daysOfWeek?.includes(dayOfWeek)) {
            activities.push({
              ...baseActivity,
              id: `${baseActivity.id}_${occurrenceCount}`,
              date: currentDate.format('YYYY-MM-DD'),
              recurring: config,
            });
            occurrenceCount++;
          }
          currentDate = currentDate.add(1, 'day');
          // Safety check to prevent infinite loop
          if (currentDate.diff(dayjs(config.startDate), 'day') > 365) {
            break;
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
