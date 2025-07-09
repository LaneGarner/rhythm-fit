import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import React, { useContext, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { HEADER_STYLES } from '../constants';
import { deleteActivity, updateActivity } from '../redux/activitySlice';
import { RootState } from '../redux/store';
import { ThemeContext } from '../theme/ThemeContext';

export default function DayScreen({ navigation, route }: any) {
  const { date } = route.params;
  const dispatch = useDispatch();
  const activities = useSelector((state: RootState) => state.activities.data);

  // Bulk selection state
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(
    new Set()
  );
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetDate, setTargetDate] = useState('');

  // Sort activities: incomplete first, then completed
  const dayActivities = activities
    .filter(activity => activity.date === date)
    .sort((a, b) => {
      if (a.completed === b.completed) {
        // If both have same completion status, maintain original order
        return 0;
      }
      // Incomplete activities first
      return a.completed ? 1 : -1;
    });

  const formattedDate = dayjs(date).format('dddd, MMMM D');

  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  // Bulk selection helpers
  const toggleBulkMode = () => {
    setIsBulkMode(!isBulkMode);
    setSelectedActivities(new Set());
  };

  const toggleActivitySelection = (activityId: string) => {
    const newSelected = new Set(selectedActivities);
    if (newSelected.has(activityId)) {
      newSelected.delete(activityId);
    } else {
      newSelected.add(activityId);
    }
    setSelectedActivities(newSelected);
  };

  const selectAll = () => {
    setSelectedActivities(new Set(dayActivities.map(a => a.id)));
  };

  const deselectAll = () => {
    setSelectedActivities(new Set());
  };

  const isAllSelected =
    selectedActivities.size === dayActivities.length &&
    dayActivities.length > 0;
  const isPartiallySelected =
    selectedActivities.size > 0 &&
    selectedActivities.size < dayActivities.length;

  // Bulk actions
  const handleBulkDelete = () => {
    if (selectedActivities.size === 0) return;

    Alert.alert(
      'Delete Activities',
      `Are you sure you want to delete ${selectedActivities.size} activity${selectedActivities.size > 1 ? 'ies' : 'y'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            selectedActivities.forEach(activityId => {
              dispatch(deleteActivity(activityId));
            });
            setSelectedActivities(new Set());
            setIsBulkMode(false);
          },
        },
      ]
    );
  };

  const handleBulkMove = () => {
    if (selectedActivities.size === 0) return;
    setShowMoveModal(true);
  };

  const confirmBulkMove = () => {
    if (!targetDate) return;

    selectedActivities.forEach(activityId => {
      const activity = activities.find(a => a.id === activityId);
      if (activity) {
        dispatch(
          updateActivity({
            ...activity,
            date: targetDate,
          })
        );
      }
    });

    setSelectedActivities(new Set());
    setIsBulkMode(false);
    setShowMoveModal(false);
    setTargetDate('');
  };

  const handleDeleteActivity = (activityId: string) => {
    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this activity?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteActivity(activityId)),
        },
      ]
    );
  };

  const handleEditActivity = (activity: any) => {
    // Navigate to edit screen
    navigation.navigate('EditActivity', { activityId: activity.id });
  };

  const handleToggleCompletion = (activity: any) => {
    // Toggle completion status
    dispatch(
      updateActivity({
        ...activity,
        completed: !activity.completed,
      })
    );
  };

  const showActivityOptions = (activity: any) => {
    if (Platform.OS === 'ios') {
      const options = ['Cancel'];
      const cancelButtonIndex = 0;
      let destructiveButtonIndex = -1;
      let editButtonIndex = -1;

      if (activity.completed) {
        options.push('Mark Incomplete');
        editButtonIndex = 1;
      } else {
        options.push('Mark Complete');
        editButtonIndex = 1;
      }

      options.push('Edit Activity');
      options.push('Delete Activity');
      destructiveButtonIndex = options.length - 1;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
          userInterfaceStyle: isDark ? 'dark' : 'light',
        },
        buttonIndex => {
          if (buttonIndex === editButtonIndex) {
            // Mark Complete/Incomplete
            handleToggleCompletion(activity);
          } else if (buttonIndex === options.length - 2) {
            // Edit Activity
            handleEditActivity(activity);
          } else if (buttonIndex === destructiveButtonIndex) {
            // Delete Activity
            handleDeleteActivity(activity.id);
          }
        }
      );
    } else {
      // Fallback for Android - use Alert
      Alert.alert(
        activity.name || activity.type,
        'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: activity.completed ? 'Mark Incomplete' : 'Mark Complete',
            onPress: () => handleToggleCompletion(activity),
          },
          {
            text: 'Edit Activity',
            onPress: () => handleEditActivity(activity),
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => handleDeleteActivity(activity.id),
          },
        ]
      );
    }
  };

  const ActivityItem = ({ activity }: { activity: any }) => {
    const isSelected = selectedActivities.has(activity.id);

    const handlePress = () => {
      if (isBulkMode) {
        toggleActivitySelection(activity.id);
      } else if (!activity.completed) {
        navigation.navigate('ActivityExecution', { activityId: activity.id });
      } else {
        showActivityOptions(activity);
      }
    };

    const handleLongPress = () => {
      if (!isBulkMode) {
        showActivityOptions(activity);
      }
    };

    return (
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        className={`p-4 rounded-lg mb-3 ${
          isDark ? 'bg-gray-800' : 'bg-white'
        } shadow-sm`}
        style={{
          opacity: activity.completed ? 0.6 : 1,
          borderWidth: isSelected ? 2 : 0,
          borderColor: '#3B82F6',
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            {isBulkMode && (
              <View className="mr-3">
                <Ionicons
                  name={isSelected ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={isSelected ? '#3B82F6' : '#6B7280'}
                />
              </View>
            )}
            <Text className="text-2xl mr-3">{activity.emoji || '💪'}</Text>
            <View className="flex-1">
              <Text
                className={`text-lg font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                {activity.name || activity.type}
              </Text>
              <Text
                className={`text-sm ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                {dayjs(activity.date).format('MMM D')}
              </Text>
            </View>
          </View>
          <View
            className={`w-3 h-3 rounded-full ${
              activity.completed ? 'bg-green-500' : 'bg-gray-300'
            }`}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const MoveToDateModal = () => (
    <Modal
      visible={showMoveModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowMoveModal(false)}
    >
      <View
        className={`flex-1 justify-center items-center ${
          isDark ? 'bg-black bg-opacity-50' : 'bg-gray-500 bg-opacity-50'
        }`}
      >
        <View
          className={`p-6 rounded-lg w-80 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          <Text
            className={`text-lg font-semibold mb-4 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            Move to Date
          </Text>
          <TextInput
            value={targetDate}
            onChangeText={setTargetDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
            className={`px-4 py-3 border rounded-lg mb-4 ${
              isDark
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
          <View className="flex-row justify-end space-x-3">
            <TouchableOpacity
              onPress={() => setShowMoveModal(false)}
              className="px-4 py-2"
            >
              <Text className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={confirmBulkMove}
              className="bg-blue-500 px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-semibold">Move</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <View
        className={`${HEADER_STYLES} ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDark ? '#FFFFFF' : '#000000'}
          />
        </TouchableOpacity>
        <View className="flex-1">
          <Text
            className={`text-xl font-semibold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {formattedDate}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Activity')}
          className="mr-2"
        >
          <Ionicons
            name="add"
            size={24}
            color={isDark ? '#FFFFFF' : '#000000'}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleBulkMode}>
          <Ionicons
            name={isBulkMode ? 'close' : 'list'}
            size={24}
            color={isDark ? '#FFFFFF' : '#000000'}
          />
        </TouchableOpacity>
      </View>

      {/* Bulk Actions */}
      {isBulkMode && (
        <View
          className={`p-4 border-b ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          <View className="flex-row justify-between items-center mb-3">
            <Text
              className={`font-semibold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              {selectedActivities.size} selected
            </Text>
            <View className="flex-row space-x-2">
              <TouchableOpacity
                onPress={selectAll}
                className="px-3 py-1 rounded bg-blue-500"
              >
                <Text className="text-white text-sm">Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={deselectAll}
                className="px-3 py-1 rounded bg-gray-500"
              >
                <Text className="text-white text-sm">Deselect All</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={handleBulkDelete}
              className="flex-1 bg-red-500 py-2 rounded-lg"
            >
              <Text className="text-white text-center font-semibold">
                Delete
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleBulkMove}
              className="flex-1 bg-blue-500 py-2 rounded-lg"
            >
              <Text className="text-white text-center font-semibold">Move</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Activities List */}
      <ScrollView className="flex-1 p-4">
        {dayActivities.length > 0 ? (
          dayActivities.map(activity => (
            <ActivityItem key={activity.id} activity={activity} />
          ))
        ) : (
          <View className="items-center py-12">
            <Text
              className={`text-lg ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              No activities for this day
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Activity')}
              className="mt-4 bg-blue-500 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold">Add Activity</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <MoveToDateModal />
    </View>
  );
}
