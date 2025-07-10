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
      `Are you sure you want to delete ${selectedActivities.size} activit${selectedActivities.size > 1 ? 'ies' : 'y'}?`,
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
    <View
      className="flex-1"
      style={{ backgroundColor: isDark ? '#000' : '#F9FAFB' }}
    >
      {/* Header */}
      <View
        style={{
          position: 'relative',
          // height: 100,
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 120,
          paddingBottom: 0,
          paddingHorizontal: 16,
          backgroundColor: isDark ? '#111' : '#fff',
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#222' : '#e5e7eb',
        }}
      >
        {/* Left: Back button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            paddingVertical: 4,
            paddingHorizontal: 8,
            marginRight: 8,
            position: 'absolute',
            left: 16,
            top: 44,
            height: 88,
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <Text style={{ color: '#2563eb', fontSize: 18, fontWeight: '500' }}>
            Back
          </Text>
        </TouchableOpacity>
        {/* Center: Title (absolutely centered) */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 44,
            height: 88,
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: 'bold',
              color: isDark ? '#fff' : '#111',
              textAlign: 'center',
            }}
          >
            {formattedDate}
          </Text>
        </View>
        {/* Right: Bulk button */}
        <TouchableOpacity
          onPress={toggleBulkMode}
          style={{
            position: 'absolute',
            right: 16,
            top: 44,
            height: 88,
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <Ionicons
            name={isBulkMode ? 'close' : 'list'}
            size={24}
            color={isDark ? '#fff' : '#111'}
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
              className={`text-lg font-semibold ${
                isDark ? 'text-gray-200' : 'text-gray-700'
              }`}
              style={{ textAlign: 'center' }}
            >
              No activities yet for this day
            </Text>
            <Text
              className={`text-base mt-2 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}
              style={{ textAlign: 'center', maxWidth: 260, lineHeight: 22 }}
            >
              Start your day strong! Tap the{' '}
              <TouchableOpacity
                onPress={() => navigation.navigate('Activity', { date })}
                hitSlop={12}
              >
                <Text
                  style={{
                    fontWeight: 'bold',
                    color: '#2563eb',
                    lineHeight: 20,
                    top: 8,
                  }}
                >
                  +
                </Text>
              </TouchableOpacity>{' '}
              button below to add your first activity.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Activity', { date })}
        style={{
          position: 'absolute',
          bottom: 102,
          right: 34,
          backgroundColor: '#2563eb',
          borderRadius: 32,
          width: 56,
          height: 56,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 5,
        }}
        activeOpacity={0.85}
        accessibilityLabel="Add Activity"
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <MoveToDateModal />
    </View>
  );
}
