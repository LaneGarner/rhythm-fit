import React from 'react';
import { Alert, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ActivityForm from '../components/ActivityForm';
import { deleteActivity, updateActivity } from '../redux/activitySlice';
import { RootState } from '../redux/store';
import { useAuth } from '../context/AuthContext';
import { pushActivityChange } from '../services/syncService';
import { Activity, RecurringConfig } from '../types/activity';

export default function EditActivityScreen({ navigation, route }: any) {
  const { activityId } = route.params;
  const dispatch = useDispatch();
  const { getAccessToken } = useAuth();

  const activities = useSelector((state: RootState) => state.activities.data);
  const activity = activities.find(a => a.id === activityId);

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
            navigation.goBack();
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

    const finalActivity: Activity = {
      ...updatedActivity,
      id: activity.id, // Preserve original ID
      completed: activity.completed, // Preserve completion status
      recurring: recurringConfig || undefined,
    };

    dispatch(updateActivity(finalActivity));
    navigation.goBack();
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
