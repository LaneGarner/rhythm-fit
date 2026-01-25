import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useDispatch } from 'react-redux';
import {
  addActivity,
  clearAllActivities as clearReduxActivities,
} from '../redux/activitySlice';
import { AppDispatch } from '../redux/store';
import {
  clearAllActivities,
  clearAllAppData,
  clearChatHistory,
  generateRandomWeekActivities,
} from '../utils/storage';
import { clearExerciseCache } from '../services/exerciseService';
import { useWeekContext } from '../WeekContext';

interface DevModeButtonProps {
  visible?: boolean;
}

const DevModeButton: React.FC<DevModeButtonProps> = ({ visible = true }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [isPressed, setIsPressed] = useState(false);
  const { weekOffset } = useWeekContext();

  if (!visible) return null;

  const showClearOptions = () => {
    Alert.alert('🔧 DEV MODE', 'Choose what to clear:', [
      {
        text: 'Clear All Data',
        style: 'destructive',
        onPress: () => confirmClearAll(),
      },
      {
        text: 'Clear Activities Only',
        style: 'destructive',
        onPress: () => confirmClearActivities(),
      },
      {
        text: 'Clear Chat History Only',
        onPress: () => confirmClearChat(),
      },
      {
        text: 'Clear Custom Exercises',
        onPress: () => confirmClearExercises(),
      },
      {
        text: 'Fill Week with Data',
        onPress: () => confirmFillWeek(),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  const confirmClearAll = () => {
    Alert.alert(
      '⚠️ CLEAR ALL DATA',
      'This will permanently delete ALL app data including activities, chat history, custom exercises, and settings. This cannot be undone.',
      [
        {
          text: 'DELETE EVERYTHING',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear storage
              await clearAllAppData();
              // Clear Redux
              dispatch(clearReduxActivities());
              Alert.alert('✅ Success', 'All app data has been cleared');
            } catch (error) {
              Alert.alert('❌ Error', 'Failed to clear all data');
              console.error('Error clearing all data:', error);
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const confirmClearActivities = () => {
    Alert.alert(
      '⚠️ CLEAR ACTIVITIES',
      'This will permanently delete all workout activities and progress. This cannot be undone.',
      [
        {
          text: 'DELETE ACTIVITIES',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllActivities();
              dispatch(clearReduxActivities());
              Alert.alert('✅ Success', 'All activities have been cleared');
            } catch (error) {
              Alert.alert('❌ Error', 'Failed to clear activities');
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const confirmClearChat = () => {
    Alert.alert(
      '⚠️ CLEAR CHAT HISTORY',
      'This will permanently delete all AI coach chat history.',
      [
        {
          text: 'DELETE CHAT',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearChatHistory();
              Alert.alert('✅ Success', 'Chat history has been cleared');
            } catch (error) {
              Alert.alert('❌ Error', 'Failed to clear chat history');
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const confirmClearExercises = () => {
    Alert.alert(
      '⚠️ CLEAR CUSTOM EXERCISES',
      "This will permanently delete all custom exercises you've created.",
      [
        {
          text: 'DELETE EXERCISES',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearExerciseCache();
              Alert.alert('✅ Success', 'Custom exercises have been cleared');
            } catch (error) {
              Alert.alert('❌ Error', 'Failed to clear custom exercises');
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const confirmFillWeek = () => {
    Alert.alert(
      '🎲 FILL WEEK WITH DATA',
      'This will generate random sample activities for the week currently in view. This will add to your existing activities.',
      [
        {
          text: 'GENERATE DATA',
          onPress: async () => {
            try {
              // Use the week offset from WeeklyScreen context
              const randomActivities = generateRandomWeekActivities(weekOffset);

              // Add each activity to Redux store
              randomActivities.forEach(activity => {
                dispatch(addActivity(activity));
              });

              Alert.alert(
                '✅ Success',
                `Generated ${randomActivities.length} random activities for the week!`
              );
            } catch (error) {
              Alert.alert('❌ Error', 'Failed to generate random activities');
              console.error('Error generating random activities:', error);
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <View
      style={{
        position: 'absolute',
        top: 50, // Below status bar
        left: 16,
        zIndex: 1000,
      }}
    >
      <Pressable
        onPress={showClearOptions}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        style={{
          backgroundColor: isPressed ? '#dc2626' : '#ef4444', // Red colors
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 4,
          borderWidth: 1,
          borderColor: '#991b1b',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 3,
        }}
      >
        <Text
          style={{
            color: 'white',
            fontSize: 10,
            fontWeight: 'bold',
            letterSpacing: 0.5,
          }}
        >
          DEV
        </Text>
      </Pressable>
    </View>
  );
};

export default DevModeButton;
