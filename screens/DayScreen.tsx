import { Ionicons } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import dayjs from 'dayjs';
import React, { useContext, useState, useCallback, useEffect } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  deleteActivity,
  updateActivity,
  reorderActivities,
  createSuperset,
  addToSuperset,
  removeFromSuperset,
  breakSuperset,
} from '../redux/activitySlice';
import { RootState } from '../redux/store';
import { useAuth } from '../context/AuthContext';
import { pushActivityChange } from '../services/syncService';
import { ThemeContext } from '../theme/ThemeContext';
import { Activity } from '../types/activity';
import ProgressBar from '../components/ProgressBar';
import SupersetBadge from '../components/SupersetBadge';
import {
  groupActivitiesWithSupersets,
  getSupersetEmojis,
  getSupersetLabel,
  isSupersetComplete,
  getSupersetCompletedCount,
  ActivityGroup,
} from '../utils/supersetUtils';

// Check if running in Expo Go (StoreClient) vs a build
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Only import DraggableFlatList in builds (not Expo Go)
let DraggableFlatList: any = null;
let ScaleDecorator: any = null;
if (!isExpoGo) {
  try {
    const draggableModule = require('react-native-draggable-flatlist');
    DraggableFlatList = draggableModule.default;
    ScaleDecorator = draggableModule.ScaleDecorator;
  } catch (e) {
    // DraggableFlatList not available, using fallback
  }
}

export default function DayScreen({ navigation, route }: any) {
  const { date } = route.params;
  const dispatch = useDispatch();
  const activities = useSelector((state: RootState) => state.activities.data);
  const { getAccessToken } = useAuth();

  // Bulk selection state
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(
    new Set()
  );
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetDate, setTargetDate] = useState('');

  // Pending order state - only saved when user clicks Save
  const [pendingOrderIds, setPendingOrderIds] = useState<string[] | null>(null);

  // Sort activities: by custom order if available, then by id (preserve order regardless of completion)
  const savedActivities = activities
    .filter(activity => activity.date === date)
    .sort((a, b) => {
      // Primary: Use custom order if available
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      // Secondary: By ID (timestamp-based, older first)
      return a.id.localeCompare(b.id);
    });

  // Use pending order if available, otherwise use saved order
  const dayActivities = pendingOrderIds
    ? pendingOrderIds
        .map(id => savedActivities.find(a => a.id === id))
        .filter((a): a is Activity => a !== undefined)
    : savedActivities;

  // Sync pendingOrderIds when activities are deleted or moved away
  useEffect(() => {
    if (pendingOrderIds) {
      const savedIds = new Set(savedActivities.map(a => a.id));
      const validPendingIds = pendingOrderIds.filter(id => savedIds.has(id));

      // If any IDs were removed, update pending order
      if (validPendingIds.length !== pendingOrderIds.length) {
        if (validPendingIds.length === 0) {
          // All activities were deleted, clear pending
          setPendingOrderIds(null);
        } else {
          setPendingOrderIds(validPendingIds);
        }
      }

      // Also add any new activities that aren't in pending order
      const pendingSet = new Set(pendingOrderIds);
      const newIds = savedActivities
        .filter(a => !pendingSet.has(a.id))
        .map(a => a.id);
      if (newIds.length > 0) {
        setPendingOrderIds([...validPendingIds, ...newIds]);
      }
    }
  }, [savedActivities, pendingOrderIds]);

  const hasUnsavedChanges = pendingOrderIds !== null;

  const formattedDate = dayjs(date).format('dddd, MMMM D');

  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  // Check if all activities for the day are completed
  const allCompleted =
    dayActivities.length > 0 && dayActivities.every(a => a.completed);
  const completedCount = dayActivities.filter(a => a.completed).length;
  const totalCount = dayActivities.length;

  // Save pending order changes
  const saveChanges = useCallback(() => {
    if (pendingOrderIds) {
      dispatch(reorderActivities({ date, orderedIds: pendingOrderIds }));
      setPendingOrderIds(null);
    }
  }, [pendingOrderIds, dispatch, date]);

  // Discard pending order changes
  const discardChanges = useCallback(() => {
    setPendingOrderIds(null);
  }, []);

  // Bulk selection helpers
  const toggleBulkMode = () => {
    if (isBulkMode) {
      // Exiting bulk mode - discard unsaved changes
      discardChanges();
    }
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

  // Move activity up or down in the list (for Expo Go arrow mode)
  const moveActivity = useCallback(
    (activityId: string, direction: 'up' | 'down') => {
      const currentIndex = dayActivities.findIndex(a => a.id === activityId);
      if (currentIndex === -1) return;

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= dayActivities.length) return;

      // Create new order by swapping positions
      const reordered = [...dayActivities];
      [reordered[currentIndex], reordered[newIndex]] = [
        reordered[newIndex],
        reordered[currentIndex],
      ];

      // Update pending order (don't dispatch yet - wait for Save)
      const orderedIds = reordered.map(a => a.id);
      setPendingOrderIds(orderedIds);
    },
    [dayActivities]
  );

  // Handle drag end for DraggableFlatList (for builds)
  const handleDragEnd = useCallback(
    ({ data: reorderedData }: { data: Activity[] }) => {
      // Update pending order (don't dispatch yet - wait for Save)
      const orderedIds = reorderedData.map(activity => activity.id);
      setPendingOrderIds(orderedIds);
    },
    []
  );

  // Bulk actions
  const handleBulkDelete = () => {
    if (selectedActivities.size === 0) return;

    Alert.alert(
      'Delete Activities',
      `Are you sure you want to delete ${selectedActivities.size} activit${selectedActivities.size > 1 ? 'ies' : 'y'}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            for (const activityId of selectedActivities) {
              const activity = activities.find(a => a.id === activityId);
              dispatch(deleteActivity(activityId));
              // Sync deletion to backend
              if (activity) {
                try {
                  const token = await getAccessToken();
                  if (token) {
                    await pushActivityChange(token, activity, true);
                  }
                } catch (err) {
                  console.error('Failed to sync deletion:', err);
                }
              }
            }
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
    const activity = activities.find(a => a.id === activityId);
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
            if (activity) {
              try {
                const token = await getAccessToken();
                if (token) {
                  await pushActivityChange(token, activity, true);
                }
              } catch (err) {
                console.error('Failed to sync deletion:', err);
              }
            }
          },
        },
      ]
    );
  };

  const handleEditActivity = (activity: any) => {
    navigation.navigate('EditActivity', { activityId: activity.id });
  };

  // Superset handlers
  const handleCreateSuperset = () => {
    if (selectedActivities.size < 2) {
      Alert.alert(
        'Select Activities',
        'Please select at least 2 activities to create a superset.'
      );
      return;
    }

    // Get selected activities in their current order
    const selectedIds = Array.from(selectedActivities);
    const orderedIds = dayActivities
      .filter(a => selectedIds.includes(a.id))
      .map(a => a.id);

    // Check if any selected activity is already in a superset
    const existingSuperset = dayActivities.find(
      a => selectedIds.includes(a.id) && a.supersetId
    );

    if (existingSuperset) {
      // Add other activities to the existing superset
      const supersetId = existingSuperset.supersetId!;
      orderedIds.forEach(id => {
        const activity = dayActivities.find(a => a.id === id);
        if (activity && !activity.supersetId) {
          dispatch(addToSuperset({ supersetId, activityId: id }));
        }
      });
    } else {
      // Create a new superset
      dispatch(createSuperset({ activityIds: orderedIds }));
    }

    setSelectedActivities(new Set());
    setIsBulkMode(false);
  };

  const handleBreakSuperset = (supersetId: string) => {
    Alert.alert(
      'Break Superset',
      'Are you sure you want to unlink these activities?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Break Superset',
          style: 'destructive',
          onPress: () => dispatch(breakSuperset(supersetId)),
        },
      ]
    );
  };

  const handleRemoveFromSuperset = (activityId: string) => {
    dispatch(removeFromSuperset(activityId));
  };

  const handleToggleCompletion = (activity: any) => {
    const newCompleted = !activity.completed;

    // When marking incomplete, also mark all sets as incomplete
    const updatedSets =
      !newCompleted && activity.sets
        ? activity.sets.map((set: any) => ({ ...set, completed: false }))
        : activity.sets;

    dispatch(
      updateActivity({
        ...activity,
        completed: newCompleted,
        sets: updatedSets,
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
            handleToggleCompletion(activity);
          } else if (buttonIndex === options.length - 2) {
            handleEditActivity(activity);
          } else if (buttonIndex === destructiveButtonIndex) {
            handleDeleteActivity(activity.id);
          }
        }
      );
    } else {
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

  // Expo Go version: Arrow-based reordering
  const ActivityItemWithArrows = ({
    activity,
    index,
  }: {
    activity: Activity;
    index: number;
  }) => {
    const isSelected = selectedActivities.has(activity.id);
    const isFirst = index === 0;
    const isLast = index === dayActivities.length - 1;

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
          borderWidth: isSelected ? 2 : 0,
          borderColor: '#3B82F6',
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            {isBulkMode && (
              <>
                <View className="mr-2">
                  <TouchableOpacity
                    onPress={() => moveActivity(activity.id, 'up')}
                    disabled={isFirst}
                    className="p-1"
                    hitSlop={{ top: 5, bottom: 5, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name="chevron-up"
                      size={18}
                      color={
                        isFirst ? '#D1D5DB' : isDark ? '#9CA3AF' : '#6B7280'
                      }
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveActivity(activity.id, 'down')}
                    disabled={isLast}
                    className="p-1"
                    hitSlop={{ top: 5, bottom: 5, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={
                        isLast ? '#D1D5DB' : isDark ? '#9CA3AF' : '#6B7280'
                      }
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => toggleActivitySelection(activity.id)}
                  className="mr-2"
                >
                  <Ionicons
                    name={isSelected ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={isSelected ? '#3B82F6' : '#6B7280'}
                  />
                </TouchableOpacity>
              </>
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
          {isBulkMode ? (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('EditActivity', {
                  activityId: activity.id,
                  fromDayEdit: true,
                  date: date,
                })
              }
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text
                style={{
                  color: isDark ? '#60A5FA' : '#2563EB',
                  fontSize: 14,
                  fontWeight: '600',
                }}
              >
                Edit
              </Text>
            </TouchableOpacity>
          ) : activity.completed ? (
            <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
          ) : (
            <Ionicons name="ellipse-outline" size={24} color="#D1D5DB" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Superset Card component (for non-bulk mode)
  const SupersetCard = ({
    group,
    index,
  }: {
    group: ActivityGroup;
    index: number;
  }) => {
    const activities = group.activities;
    const supersetComplete = isSupersetComplete(activities);
    const completedCount = getSupersetCompletedCount(activities);

    const handlePress = () => {
      if (isBulkMode) {
        // In bulk mode, select all activities in the superset
        activities.forEach(a => {
          if (!selectedActivities.has(a.id)) {
            toggleActivitySelection(a.id);
          }
        });
      } else {
        // Navigate to superset execution
        navigation.navigate('SupersetExecution', {
          supersetId: group.supersetId,
        });
      }
    };

    const handleLongPress = () => {
      if (!isBulkMode && group.supersetId) {
        if (Platform.OS === 'ios') {
          ActionSheetIOS.showActionSheetWithOptions(
            {
              options: ['Cancel', 'Break Superset'],
              cancelButtonIndex: 0,
              destructiveButtonIndex: 1,
              userInterfaceStyle: isDark ? 'dark' : 'light',
            },
            buttonIndex => {
              if (buttonIndex === 1) {
                handleBreakSuperset(group.supersetId!);
              }
            }
          );
        } else {
          Alert.alert('Superset Options', 'What would you like to do?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Break Superset',
              style: 'destructive',
              onPress: () => handleBreakSuperset(group.supersetId!),
            },
          ]);
        }
      }
    };

    // Check if any activity in superset is selected
    const hasSelectedActivity = activities.some(a =>
      selectedActivities.has(a.id)
    );

    return (
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        className={`p-4 rounded-lg mb-3 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}
        style={{
          borderWidth: hasSelectedActivity ? 2 : 0,
          borderColor: '#8B5CF6',
          borderLeftWidth: 4,
          borderLeftColor: '#8B5CF6',
        }}
      >
        {/* Superset badge */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <SupersetBadge label={getSupersetLabel(activities.length)} />
          <Text
            style={{
              marginLeft: 8,
              color: isDark ? '#9CA3AF' : '#6B7280',
              fontSize: 12,
            }}
          >
            {completedCount}/{activities.length} complete
          </Text>
        </View>

        {/* Combined emoji + name display */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-2">
            <Text
              className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
              numberOfLines={2}
            >
              {getSupersetEmojis(activities)}
            </Text>
          </View>
          {supersetComplete ? (
            <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
          ) : (
            <Ionicons name="ellipse-outline" size={24} color="#D1D5DB" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Build version: Drag handle reordering with DraggableFlatList
  const renderDraggableItem = useCallback(
    ({ item: activity, drag, isActive }: any) => {
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

      const content = (
        <TouchableOpacity
          onPress={handlePress}
          onLongPress={isBulkMode ? undefined : handleLongPress}
          disabled={isActive}
          activeOpacity={0.7}
          className={`p-4 rounded-lg mb-3 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          } shadow-sm`}
          style={{
            borderWidth: isSelected ? 2 : isActive ? 2 : 0,
            borderColor: isActive ? '#10B981' : '#3B82F6',
            backgroundColor: isActive
              ? isDark
                ? '#374151'
                : '#F3F4F6'
              : isDark
                ? '#1f2937'
                : '#ffffff',
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              {isBulkMode && (
                <>
                  <TouchableOpacity
                    onLongPress={drag}
                    delayLongPress={100}
                    disabled={isActive}
                    className="mr-2 p-2"
                    style={{
                      backgroundColor: isActive
                        ? isDark
                          ? '#4B5563'
                          : '#E5E7EB'
                        : 'transparent',
                      borderRadius: 4,
                    }}
                  >
                    <Ionicons
                      name="reorder-three"
                      size={24}
                      color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => toggleActivitySelection(activity.id)}
                    className="mr-2"
                  >
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={isSelected ? '#3B82F6' : '#6B7280'}
                    />
                  </TouchableOpacity>
                </>
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
            {isBulkMode ? (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('EditActivity', {
                    activityId: activity.id,
                    fromDayEdit: true,
                    date: date,
                  })
                }
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text
                  style={{
                    color: isDark ? '#60A5FA' : '#2563EB',
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  Edit
                </Text>
              </TouchableOpacity>
            ) : activity.completed ? (
              <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
            ) : (
              <Ionicons name="ellipse-outline" size={24} color="#D1D5DB" />
            )}
          </View>
        </TouchableOpacity>
      );

      return ScaleDecorator ? (
        <ScaleDecorator>{content}</ScaleDecorator>
      ) : (
        content
      );
    },
    [
      selectedActivities,
      isBulkMode,
      isDark,
      navigation,
      toggleActivitySelection,
    ]
  );

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
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
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

  // Render the appropriate list based on environment
  const renderActivitiesList = () => {
    if (dayActivities.length === 0) {
      return (
        <ScrollView className="flex-1 p-4">
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
        </ScrollView>
      );
    }

    // Use arrows in Expo Go or if DraggableFlatList isn't available
    if (isExpoGo || !DraggableFlatList) {
      return (
        <ScrollView className="flex-1 p-4">
          {totalCount > 0 && !isBulkMode && (
            <View style={{ marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                {allCompleted && (
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color="#22C55E"
                    style={{ marginRight: 6 }}
                  />
                )}
                <Text
                  style={{
                    color: isDark ? '#a3a3a3' : '#6b7280',
                    fontSize: 14,
                  }}
                >
                  {completedCount}/{totalCount} complete
                </Text>
              </View>
              <ProgressBar
                completed={completedCount}
                total={totalCount}
                isDark={isDark}
              />
            </View>
          )}
          {isBulkMode
            ? // In bulk mode, show all activities individually for selection
              dayActivities.map((activity, index) => (
                <ActivityItemWithArrows
                  key={activity.id}
                  activity={activity}
                  index={index}
                />
              ))
            : // In normal mode, group supersets
              groupActivitiesWithSupersets(dayActivities).map((group, index) =>
                group.type === 'superset' ? (
                  <SupersetCard
                    key={group.supersetId}
                    group={group}
                    index={index}
                  />
                ) : (
                  <ActivityItemWithArrows
                    key={group.activities[0].id}
                    activity={group.activities[0]}
                    index={index}
                  />
                )
              )}
        </ScrollView>
      );
    }

    // Production build: Use DraggableFlatList for bulk mode, ScrollView for normal mode
    if (isBulkMode) {
      return (
        <DraggableFlatList
          data={dayActivities}
          keyExtractor={(item: Activity) => item.id}
          renderItem={renderDraggableItem}
          onDragEnd={handleDragEnd}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          activationDistance={0}
        />
      );
    }

    // Normal mode with grouped superset rendering
    return (
      <ScrollView
        className="flex-1 p-4"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {totalCount > 0 && (
          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              {allCompleted && (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color="#22C55E"
                  style={{ marginRight: 6 }}
                />
              )}
              <Text
                style={{
                  color: isDark ? '#a3a3a3' : '#6b7280',
                  fontSize: 14,
                }}
              >
                {completedCount}/{totalCount} complete
              </Text>
            </View>
            <ProgressBar
              completed={completedCount}
              total={totalCount}
              isDark={isDark}
            />
          </View>
        )}
        {groupActivitiesWithSupersets(dayActivities).map((group, index) =>
          group.type === 'superset' ? (
            <SupersetCard key={group.supersetId} group={group} index={index} />
          ) : (
            <ActivityItemWithArrows
              key={group.activities[0].id}
              activity={group.activities[0]}
              index={index}
            />
          )
        )}
      </ScrollView>
    );
  };

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: isDark ? '#000' : '#F9FAFB' }}
    >
      {/* Header */}
      <View
        style={{
          position: 'relative',
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
          onPress={() => navigation.navigate('Main')}
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
        {/* Center: Title */}
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
        {/* Right: Bulk button - only show if there are activities */}
        {(dayActivities.length > 0 || isBulkMode) && (
          <TouchableOpacity
            onPress={toggleBulkMode}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              position: 'absolute',
              right: 20,
              top: 44,
              height: 88,
              justifyContent: 'center',
              zIndex: 2,
              padding: 8,
            }}
          >
            <Text
              style={{
                color: isDark ? '#60A5FA' : '#2563EB',
                fontSize: 16,
                fontWeight: '600',
              }}
            >
              {isBulkMode ? 'Done' : 'Edit'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bulk Actions */}
      {isBulkMode && (
        <View
          className={`p-4 border-b ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          {/* Selected count and reorder hint */}
          <Text
            className={`font-semibold mb-2 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {selectedActivities.size} selected
            {isExpoGo || !DraggableFlatList
              ? ' (use arrows to reorder)'
              : ' (hold ≡ to drag)'}
          </Text>

          {/* Select/Deselect buttons */}
          <View className="flex-row space-x-2 mb-3">
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

          {/* Action buttons */}
          <View className="flex-row space-x-2 mb-2">
            <TouchableOpacity
              onPress={handleBulkDelete}
              className="flex-1 bg-red-500 py-2 rounded-lg"
              style={{ opacity: selectedActivities.size === 0 ? 0.5 : 1 }}
              disabled={selectedActivities.size === 0}
            >
              <Text className="text-white text-center font-semibold">
                Delete
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleBulkMove}
              className="flex-1 bg-blue-500 py-2 rounded-lg"
              style={{ opacity: selectedActivities.size === 0 ? 0.5 : 1 }}
              disabled={selectedActivities.size === 0}
            >
              <Text className="text-white text-center font-semibold">
                Change Date
              </Text>
            </TouchableOpacity>
          </View>

          {/* Superset button - show when 2+ activities selected */}
          {selectedActivities.size >= 2 && (
            <TouchableOpacity
              onPress={handleCreateSuperset}
              className="bg-purple-500 py-2 rounded-lg mb-2"
            >
              <Text className="text-white text-center font-semibold">
                Link as Superset
              </Text>
            </TouchableOpacity>
          )}

          {/* Save/Undo buttons - only show when there are unsaved changes */}
          {hasUnsavedChanges && (
            <View className="flex-row space-x-2">
              <TouchableOpacity
                onPress={discardChanges}
                className="flex-1 bg-gray-500 py-3 rounded-lg"
              >
                <Text className="text-white text-center font-semibold text-base">
                  Undo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveChanges}
                className="flex-1 bg-green-500 py-3 rounded-lg"
              >
                <Text className="text-white text-center font-semibold text-base">
                  Save Order
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Activities List */}
      {renderActivitiesList()}

      {/* Floating Add Button */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Activity', { date })}
        style={{
          position: 'absolute',
          bottom: 50,
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
