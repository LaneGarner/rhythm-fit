import { Ionicons } from '@expo/vector-icons';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Keyboard,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { ACTIVITY_TYPES } from '../constants';
import { updateActivity } from '../redux/activitySlice';
import { RootState } from '../redux/store';
import { ThemeContext } from '../theme/ThemeContext';
import { Activity, SetData } from '../types/activity';

export default function ActivityExecutionScreen({ navigation, route }: any) {
  const { activityId } = route.params;
  const dispatch = useDispatch();
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  const activities = useSelector((state: RootState) => state.activities.data);
  const activity = activities.find(a => a.id === activityId);

  const [sets, setSets] = useState<SetData[]>(activity?.sets || []);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerExpanded, setIsTimerExpanded] = useState(false);
  const [isCompleted, setIsCompleted] = useState(activity?.completed || false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to get activity type label
  const getActivityTypeLabel = (type: string) => {
    const activityType = ACTIVITY_TYPES.find(at => at.value === type);
    return activityType?.label || type;
  };

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      'keyboardWillShow',
      e => {
        setIsKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHideListener = Keyboard.addListener(
      'keyboardWillHide',
      () => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = () => {
    setIsTimerRunning(true);
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
  };

  const handleAddSet = () => {
    const newSetId = Date.now().toString();
    const newSet: SetData = {
      id: newSetId,
      reps: 0,
      weight: 0,
      completed: false,
    };
    const updatedSets = [...sets, newSet];
    setSets(updatedSets);
    setCurrentSetIndex(sets.length);

    // Auto-save progress when new set is added
    if (activity) {
      const updatedActivity: Activity = {
        ...activity,
        sets: updatedSets,
      };
      dispatch(updateActivity(updatedActivity));
    }

    // Focus the weight input of the new set after render
    setTimeout(() => {
      setInputRefs.current[newSetId]?.focus();
    }, 100);
  };

  const handleDuplicateSet = (setToDuplicate: SetData) => {
    const newSet: SetData = {
      id: Date.now().toString(),
      reps: setToDuplicate.reps,
      weight: setToDuplicate.weight,
      completed: false,
    };
    const updatedSets = [...sets, newSet];
    setSets(updatedSets);
    setCurrentSetIndex(sets.length);

    // Auto-save progress when set is duplicated
    if (activity) {
      const updatedActivity: Activity = {
        ...activity,
        sets: updatedSets,
      };
      dispatch(updateActivity(updatedActivity));
    }
  };

  const handleUpdateSet = (setId: string, updates: Partial<SetData>) => {
    const updatedSets = sets.map(set =>
      set.id === setId ? { ...set, ...updates } : set
    );
    setSets(updatedSets);

    // Auto-save progress when sets are updated
    if (activity) {
      const updatedActivity: Activity = {
        ...activity,
        sets: updatedSets,
      };
      dispatch(updateActivity(updatedActivity));

      // Check if all sets are now complete - auto-complete activity
      const allSetsComplete =
        updatedSets.length > 0 && updatedSets.every(s => s.completed);
      if (allSetsComplete && !activity.completed) {
        const completedActivity: Activity = {
          ...activity,
          completed: true,
          sets: updatedSets,
        };
        dispatch(updateActivity(completedActivity));
        Alert.alert('🎉 Nice Work!', 'All sets complete. Activity finished!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    }
  };

  const handleDeleteSet = (setId: string) => {
    const updatedSets = sets.filter(set => set.id !== setId);
    setSets(updatedSets);

    // Auto-save progress when set is deleted
    if (activity) {
      const updatedActivity: Activity = {
        ...activity,
        sets: updatedSets,
      };
      dispatch(updateActivity(updatedActivity));
    }
  };

  const showSetOptions = (set: SetData) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Duplicate', 'Delete'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 2,
          userInterfaceStyle: isDark ? 'dark' : 'light',
        },
        buttonIndex => {
          if (buttonIndex === 1) {
            handleDuplicateSet(set);
          } else if (buttonIndex === 2) {
            handleDeleteSet(set.id);
          }
        }
      );
    } else {
      Alert.alert('Set Options', 'What would you like to do?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Duplicate', onPress: () => handleDuplicateSet(set) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteSet(set.id),
        },
      ]);
    }
  };

  const handleCompleteActivity = () => {
    if (!activity) return;

    // Mark all sets as completed first for visual feedback
    const completedSets = sets.map(set => ({ ...set, completed: true }));
    setSets(completedSets);

    const updatedActivity: Activity = {
      ...activity,
      completed: true,
      sets: completedSets,
    };

    dispatch(updateActivity(updatedActivity));

    // Delay alert so user can see all sets turn green
    setTimeout(() => {
      Alert.alert('🎉 Nice Work!', 'Activity complete!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }, 300);
  };

  const handleSaveProgress = () => {
    if (!activity) return;

    const updatedActivity: Activity = {
      ...activity,
      sets: sets,
    };

    dispatch(updateActivity(updatedActivity));
    Alert.alert('Progress Saved', 'Your progress has been saved.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  if (!activity) {
    return (
      <View
        className={`flex-1 justify-center items-center ${
          isDark ? 'bg-gray-900' : 'bg-gray-50'
        }`}
      >
        <Text className={`text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Activity not found
        </Text>
      </View>
    );
  }

  const scrollViewRef = useRef<ScrollView | null>(null);
  const setInputRefs = useRef<{ [key: string]: TextInput | null }>({});

  const scrollToSetInput = (setId: string) => {
    const inputRef = setInputRefs.current[setId];
    if (inputRef && scrollViewRef.current) {
      inputRef.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({
            y: y - 100,
            animated: true,
          });
        },
        () => {
          // Failed to measure set input position
        }
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#F9FAFB' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 72,
          paddingBottom: 16,
          paddingHorizontal: 16,
          backgroundColor: isDark ? '#111' : '#fff',
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#222' : '#e5e7eb',
        }}
      >
        <TouchableOpacity
          hitSlop={14}
          onPress={() => navigation.goBack()}
          style={{ paddingVertical: 4, paddingHorizontal: 8, marginRight: 8 }}
        >
          <Text style={{ color: '#2563eb', fontSize: 18, fontWeight: '500' }}>
            Back
          </Text>
        </TouchableOpacity>
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 66,
            height: 40,
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
            {activity.name}
          </Text>
        </View>
        <TouchableOpacity
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          onPress={() =>
            navigation.navigate('EditActivity', { activityId: activity.id })
          }
          style={{
            position: 'absolute',
            right: 16,
            top: 66,
            padding: 8,
          }}
        >
          <Ionicons name="pencil" size={20} color={isDark ? '#fff' : '#111'} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className={`flex-1`}
        contentContainerStyle={{
          paddingBottom: isKeyboardVisible ? keyboardHeight + 100 : 200,
        }}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        ref={scrollViewRef}
      >
        <View className="p-4 space-y-6">
          {/* Header */}
          <View className="items-center">
            <Text className="text-4xl mb-2">{activity.emoji}</Text>
            <Text
              className={`text-2xl font-bold text-center ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              {activity.name}
            </Text>
            <Text
              className={`text-base mt-1 ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              {getActivityTypeLabel(activity.type)}
            </Text>
          </View>

          {/* Notes */}
          {activity.notes && (
            <View
              className={`p-4 rounded-lg ${
                isDark ? 'bg-gray-800' : 'bg-white'
              } shadow-sm`}
            >
              <View className="flex-row items-center mb-2">
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={isDark ? '#9CA3AF' : '#6B7280'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  className={`text-sm font-medium ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  Notes
                </Text>
              </View>
              <Text
                className={`text-base ${
                  isDark ? 'text-gray-200' : 'text-gray-700'
                }`}
              >
                {activity.notes}
              </Text>
            </View>
          )}

          {/* Timer - Collapsible */}
          <View
            className={`rounded-lg ${
              isDark ? 'bg-gray-800' : 'bg-white'
            } shadow-sm overflow-hidden`}
          >
            <TouchableOpacity
              onPress={() => setIsTimerExpanded(!isTimerExpanded)}
              className="flex-row items-center justify-between p-4"
            >
              <View className="flex-row items-center">
                <Ionicons
                  name="timer-outline"
                  size={22}
                  color={isDark ? '#9CA3AF' : '#6B7280'}
                  style={{ marginRight: 8 }}
                />
                <Text
                  className={`text-lg font-semibold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  Timer
                </Text>
                {isTimerRunning && (
                  <Text
                    className="ml-3 text-base font-mono"
                    style={{ color: '#22C55E' }}
                  >
                    {formatTime(timerSeconds)}
                  </Text>
                )}
              </View>
              <Ionicons
                name={isTimerExpanded ? 'chevron-up' : 'chevron-down'}
                size={24}
                color={isDark ? '#9CA3AF' : '#6B7280'}
              />
            </TouchableOpacity>

            {isTimerExpanded && (
              <View className="px-4 pb-4">
                <Text
                  className={`text-4xl font-mono text-center mb-4 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {formatTime(timerSeconds)}
                </Text>
                <View className="flex-row justify-center space-x-4">
                  {!isTimerRunning ? (
                    <TouchableOpacity
                      onPress={handleStartTimer}
                      className="bg-green-500 px-6 py-2 rounded-lg"
                      style={{ minWidth: 80, alignItems: 'center' }}
                    >
                      <Text className="text-white font-semibold">Start</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={handlePauseTimer}
                      className="bg-yellow-500 px-6 py-2 rounded-lg"
                      style={{ minWidth: 80, alignItems: 'center' }}
                    >
                      <Text className="text-white font-semibold">Pause</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={handleResetTimer}
                    className="bg-red-500 px-6 py-2 rounded-lg"
                    style={{ minWidth: 80, alignItems: 'center' }}
                  >
                    <Text className="text-white font-semibold">Reset</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Sets */}
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text
                className={`text-lg font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                Sets ({sets.length})
              </Text>
              <TouchableOpacity
                onPress={handleAddSet}
                className="bg-blue-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-semibold">Add Set</Text>
              </TouchableOpacity>
            </View>

            {/* Add refs for set inputs */}
            {sets.map((set, index) => (
              <View
                key={set.id}
                className={`p-4 rounded-lg mb-3 ${
                  isDark ? 'bg-gray-800' : 'bg-white'
                } shadow-sm`}
              >
                <View className="flex-row justify-between items-center mb-3">
                  <Text
                    className={`text-lg font-semibold ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    Set {index + 1}
                  </Text>
                  <TouchableOpacity
                    onPress={() => showSetOptions(set)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    className="p-1"
                  >
                    <Ionicons
                      name="ellipsis-vertical"
                      size={20}
                      color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                  </TouchableOpacity>
                </View>
                <View className="flex-row space-x-4">
                  <View className="flex-1">
                    <Text
                      className={`text-sm mb-1 ${
                        isDark ? 'text-gray-300' : 'text-gray-600'
                      }`}
                    >
                      Weight (lbs)
                    </Text>
                    <TextInput
                      ref={ref => {
                        setInputRefs.current[set.id] = ref;
                      }}
                      value={set.weight != null ? set.weight.toString() : ''}
                      onChangeText={text =>
                        handleUpdateSet(set.id, {
                          weight: text ? parseInt(text) : undefined,
                        })
                      }
                      keyboardType="numeric"
                      className={`px-3 py-2 border rounded-lg ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder=""
                      placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                      returnKeyType="done"
                      blurOnSubmit={false}
                      onFocus={() => {
                        setTimeout(() => {
                          scrollToSetInput(set.id);
                        }, 100);
                      }}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-sm mb-1 ${
                        isDark ? 'text-gray-300' : 'text-gray-600'
                      }`}
                    >
                      Reps
                    </Text>
                    <TextInput
                      value={set.reps != null ? set.reps.toString() : ''}
                      onChangeText={text =>
                        handleUpdateSet(set.id, {
                          reps: text ? parseInt(text) : undefined,
                        })
                      }
                      keyboardType="numeric"
                      className={`px-3 py-2 border rounded-lg ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder=""
                      placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                      returnKeyType="done"
                      blurOnSubmit={true}
                      onFocus={() => {
                        setTimeout(() => {
                          scrollToSetInput(set.id);
                        }, 100);
                      }}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    handleUpdateSet(set.id, { completed: !set.completed })
                  }
                  className="mt-5 px-4 py-4 rounded-lg"
                  style={{
                    backgroundColor: set.completed
                      ? isDark
                        ? '#1f2937'
                        : '#fff'
                      : '#D1D5DB',
                    borderWidth: 2,
                    borderColor: set.completed ? '#22C55E' : '#D1D5DB',
                  }}
                >
                  <Text
                    className={`text-center font-semibold text-lg`}
                    style={{
                      color: set.completed ? '#22C55E' : '#374151',
                    }}
                  >
                    {set.completed ? 'Completed  ✅' : 'Mark Complete'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            {sets.length === 0 && (
              <Text
                className={`text-center py-8 ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                No sets added yet. Tap "Add Set" to get started.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Action Buttons */}
      <View
        className={`absolute left-0 right-0 p-4 border-t ${
          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}
        style={{
          bottom: isKeyboardVisible ? keyboardHeight : 0,
          paddingBottom: isKeyboardVisible ? 16 : 34,
          zIndex: 1000,
        }}
      >
        <TouchableOpacity
          onPress={handleCompleteActivity}
          className="bg-green-500 py-3 px-6 rounded-lg"
        >
          <Text className="text-white text-center font-semibold text-lg">
            Complete Activity
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
