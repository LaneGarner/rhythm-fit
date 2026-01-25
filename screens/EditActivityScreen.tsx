import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import React from 'react';
import { Alert, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ActivityForm from '../components/ActivityForm';
import {
  addActivity,
  deleteActivity,
  updateActivity,
} from '../redux/activitySlice';
import { RootState } from '../redux/store';
import { useAuth } from '../context/AuthContext';
import { pushActivityChange } from '../services/syncService';
import { Activity, RecurringConfig } from '../types/activity';

dayjs.extend(isSameOrAfter);

export default function EditActivityScreen({ navigation, route }: any) {
  const { activityId } = route.params;
  const dispatch = useDispatch();
  const { getAccessToken } = useAuth();

  const activities = useSelector((state: RootState) => state.activities.data);
  const activity = activities.find(a => a.id === activityId);

  // Helper to get base ID (strips _0, _1, etc. suffix if present)
  const getBaseId = (id: string): string => {
    const match = id.match(/^(.+)_\d+$/);
    return match ? match[1] : id;
  };

  // Find all activities in the same recurring series
  const getRelatedActivities = (baseId: string): Activity[] => {
    return activities.filter(a => {
      const aBaseId = getBaseId(a.id);
      return aBaseId === baseId || a.id === baseId;
    });
  };

  const createRecurringActivities = (
    baseActivity: Activity,
    config: RecurringConfig
  ): Activity[] => {
    const newActivities: Activity[] = [];

    if (config.pattern === 'daily') {
      for (let i = 0; i < config.occurrences!; i++) {
        const activityDate = dayjs(config.startDate).add(i, 'day');
        newActivities.push({
          ...baseActivity,
          id: `${baseActivity.id}_${i}`,
          date: activityDate.format('YYYY-MM-DD'),
          recurring: config,
        });
      }
    } else if (config.pattern === 'weekly') {
      if (config.frequency === 'this') {
        const start = dayjs(config.startDate);
        (config.daysOfWeek || []).forEach((dow, i) => {
          const date = start.day(dow);
          newActivities.push({
            ...baseActivity,
            id: `${baseActivity.id}_${i}`,
            date: date.format('YYYY-MM-DD'),
            recurring: config,
          });
        });
      } else {
        const weeks = config.occurrences || 1;
        const startDateObj = dayjs(config.startDate);
        let activityIndex = 0;

        for (let week = 0; week < weeks; week++) {
          for (const dayOfWeek of config.daysOfWeek || []) {
            const weekStart = startDateObj.add(week, 'week').startOf('week');
            const activityDate = weekStart.day(dayOfWeek);

            if (activityDate.isSameOrAfter(startDateObj, 'day')) {
              newActivities.push({
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

    return newActivities;
  };

  const handleDelete = () => {
    if (!activity) return;

    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this activity? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Navigate to Day view first to avoid crash from rendering deleted activity
            navigation.navigate('Day', { date: activity.date });
            dispatch(deleteActivity(activityId));
            // Sync deletion to backend
            try {
              const token = await getAccessToken();
              if (token) {
                await pushActivityChange(token, activity, true);
              }
            } catch (err) {
              console.error('Failed to sync deletion:', err);
            }
          },
        },
      ]
    );
  };

  const handleSave = (
    updatedActivity: Activity,
    recurringConfig?: RecurringConfig
  ) => {
    if (!activity) return;

    // Check if recurring config changed
    const oldConfig = activity.recurring;
    const configChanged =
      JSON.stringify(oldConfig) !== JSON.stringify(recurringConfig);

    if (recurringConfig && configChanged) {
      // Capture data before any changes
      const baseId = getBaseId(activity.id);
      const relatedActivities = getRelatedActivities(baseId);
      const originalStartDate = activity.recurring?.startDate;
      const targetDate =
        originalStartDate || recurringConfig.startDate || activity.date;

      // Delete all related activities from the old recurring series
      relatedActivities.forEach(a => {
        dispatch(deleteActivity(a.id));
      });

      // Create new recurring activities with a fresh base ID
      const newBaseId = Date.now().toString();
      const baseActivityForRecurring: Activity = {
        ...updatedActivity,
        id: newBaseId,
        completed: false,
      };

      const newActivities = createRecurringActivities(
        baseActivityForRecurring,
        recurringConfig
      );
      newActivities.forEach(a => {
        dispatch(addActivity(a));
      });

      // Reset navigation stack to avoid "activity not found" on stale screens
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Main' },
          { name: 'Day', params: { date: targetDate } },
        ],
      });
    } else {
      // No recurring config change, just update the single activity
      const finalActivity: Activity = {
        ...updatedActivity,
        id: activity.id,
        completed: activity.completed,
        recurring: recurringConfig || undefined,
      };
      dispatch(updateActivity(finalActivity));
      navigation.goBack();
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (!activity) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-lg">Activity not found</Text>
      </View>
    );
  }

  return (
    <ActivityForm
      mode="edit"
      initialActivity={activity}
      onSave={handleSave}
      onCancel={handleCancel}
      onDelete={handleDelete}
    />
  );
}
