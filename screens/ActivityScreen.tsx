import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';

dayjs.extend(isSameOrAfter);
import { useDispatch } from 'react-redux';
import ActivityForm from '../components/ActivityForm';
import { addActivity } from '../redux/activitySlice';
import { Activity, RecurringConfig } from '../types/activity';
import { useWeekBoundaries } from '../hooks/useWeekBoundaries';
import { generateSupersetId } from '../utils/supersetUtils';

export default function ActivityScreen({ navigation, route }: any) {
  const { date } = route.params || {};
  const dispatch = useDispatch();
  const { getWeekStart } = useWeekBoundaries();

  const [supersetMode, setSupersetMode] = useState(false);
  const [supersetDrafts, setSupersetDrafts] = useState<Activity[]>([]);
  const [formKey, setFormKey] = useState(0);

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
            // Use user's week start preference instead of dayjs default (Sunday)
            const weekStart = getWeekStart(startDateObj.add(week * 7, 'day'));
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
    if (supersetMode) {
      setSupersetDrafts(prev => [...prev, activity]);
      setFormKey(prev => prev + 1);
      return;
    }

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

  const handleSaveSuperset = useCallback(() => {
    if (supersetDrafts.length < 2) return;

    const hasRecurring = supersetDrafts.find(d => d.recurring);

    if (hasRecurring) {
      // For recurring supersets, group by date with shared supersetIds per date
      const config = hasRecurring.recurring!;
      const expandedByDate = new Map<string, Activity[]>();

      for (const draft of supersetDrafts) {
        const expanded = createRecurringActivities(draft, config);
        for (const act of expanded) {
          const dateKey = act.date;
          if (!expandedByDate.has(dateKey)) {
            expandedByDate.set(dateKey, []);
          }
          expandedByDate.get(dateKey)!.push(act);
        }
      }

      // Assign supersetId per date group
      for (const [, activities] of expandedByDate) {
        const ssId = generateSupersetId();
        activities.forEach((act, idx) => {
          act.supersetId = ssId;
          act.supersetPosition = idx + 1;
          act.id = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          dispatch(addActivity(act));
        });
      }
    } else {
      // Simple superset: all activities on the same date
      const ssId = generateSupersetId();
      supersetDrafts.forEach((draft, index) => {
        const activity: Activity = {
          ...draft,
          id: `${Date.now()}_${index}`,
          supersetId: ssId,
          supersetPosition: index + 1,
        };
        dispatch(addActivity(activity));
      });
    }

    navigation.goBack();
  }, [supersetDrafts, dispatch, navigation]);

  const handleToggleSupersetMode = (enabled: boolean) => {
    if (!enabled && supersetDrafts.length > 0) {
      Alert.alert(
        'Discard Superset?',
        'Turning off superset mode will remove all added exercises.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setSupersetMode(false);
              setSupersetDrafts([]);
              setFormKey(prev => prev + 1);
            },
          },
        ]
      );
      return;
    }
    setSupersetMode(enabled);
  };

  const handleRemoveDraft = (index: number) => {
    setSupersetDrafts(prev => prev.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    if (supersetMode && supersetDrafts.length > 0) {
      Alert.alert(
        'Discard Superset?',
        'You have unsaved exercises. Are you sure you want to leave?',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
      return;
    }
    navigation.goBack();
  };

  // Pass the date from route params so the activity defaults to that day
  const initialActivity = date ? ({ date } as any) : undefined;

  return (
    <ActivityForm
      key={formKey}
      mode="create"
      initialActivity={initialActivity}
      onSave={handleSave}
      onCancel={handleCancel}
      supersetMode={supersetMode}
      onToggleSupersetMode={handleToggleSupersetMode}
      supersetDrafts={supersetDrafts}
      onRemoveDraft={handleRemoveDraft}
      saveButtonLabel={supersetMode ? 'Add Exercise' : undefined}
      headerTitle={supersetMode ? 'Create Superset' : undefined}
      onSaveSuperset={handleSaveSuperset}
    />
  );
}
