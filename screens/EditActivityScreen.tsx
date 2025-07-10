import React from 'react';
import { Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ActivityForm from '../components/ActivityForm';
import { updateActivity } from '../redux/activitySlice';
import { RootState } from '../redux/store';
import { Activity, RecurringConfig } from '../types/activity';

export default function EditActivityScreen({ navigation, route }: any) {
  const { activityId } = route.params;
  const dispatch = useDispatch();

  const activities = useSelector((state: RootState) => state.activities.data);
  const activity = activities.find(a => a.id === activityId);

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
    />
  );
}
