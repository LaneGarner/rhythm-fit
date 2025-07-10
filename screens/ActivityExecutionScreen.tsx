import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
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
  const [isCompleted, setIsCompleted] = useState(activity?.completed || false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
    const newSet: SetData = {
      id: Date.now().toString(),
      reps: 0,
      weight: 0,
      completed: false,
    };
    setSets([...sets, newSet]);
    setCurrentSetIndex(sets.length);
  };

  const handleUpdateSet = (setId: string, updates: Partial<SetData>) => {
    setSets(sets.map(set => (set.id === setId ? { ...set, ...updates } : set)));
  };

  const handleCompleteActivity = () => {
    if (!activity) return;

    const updatedActivity: Activity = {
      ...activity,
      completed: true,
      sets: sets,
    };

    dispatch(updateActivity(updatedActivity));
    Alert.alert('Activity Completed!', 'Great job!', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
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
          console.log('Failed to measure set input position');
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
              {activity.type}
            </Text>
          </View>

          {/* Timer */}
          <View
            className={`p-4 rounded-lg ${
              isDark ? 'bg-gray-800' : 'bg-white'
            } shadow-sm`}
          >
            <Text
              className={`text-lg font-semibold mb-3 text-center ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Timer
            </Text>
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
                <Text
                  className={`text-lg font-semibold mb-3 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  Set {index + 1}
                </Text>
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
                      value={set.weight?.toString() || ''}
                      onChangeText={text =>
                        handleUpdateSet(set.id, { weight: parseInt(text) || 0 })
                      }
                      keyboardType="numeric"
                      className={`px-3 py-2 border rounded-lg ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="0"
                      placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                      returnKeyType="next"
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
                      value={set.reps?.toString() || ''}
                      onChangeText={text =>
                        handleUpdateSet(set.id, { reps: parseInt(text) || 0 })
                      }
                      keyboardType="numeric"
                      className={`px-3 py-2 border rounded-lg ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="0"
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
                  className={`mt-3 px-4 py-2 rounded-lg ${
                    set.completed ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      set.completed ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {set.completed ? 'Completed' : 'Mark Complete'}
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
