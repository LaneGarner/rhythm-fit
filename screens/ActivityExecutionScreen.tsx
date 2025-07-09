import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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

  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
        contentContainerStyle={{ paddingBottom: 100 }}
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
                >
                  <Text className="text-white font-semibold">Start</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handlePauseTimer}
                  className="bg-yellow-500 px-6 py-2 rounded-lg"
                >
                  <Text className="text-white font-semibold">Pause</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleResetTimer}
                className="bg-red-500 px-6 py-2 rounded-lg"
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
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-sm mb-1 ${
                        isDark ? 'text-gray-300' : 'text-gray-600'
                      }`}
                    >
                      Weight (lbs)
                    </Text>
                    <TextInput
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

      {/* Action Buttons */}
      <View
        className={`absolute bottom-0 left-0 right-0 p-4 border-t ${
          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}
      >
        <View className="flex-row space-x-4">
          <TouchableOpacity
            onPress={handleSaveProgress}
            className="flex-1 bg-gray-500 py-3 px-6 rounded-lg"
          >
            <Text className="text-white text-center font-semibold">
              Save Progress
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCompleteActivity}
            className="flex-1 bg-green-500 py-3 px-6 rounded-lg"
          >
            <Text className="text-white text-center font-semibold">
              Complete Activity
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
