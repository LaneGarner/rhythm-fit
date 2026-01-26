import { Ionicons } from '@expo/vector-icons';
import React, { useContext, useState, useEffect } from 'react';
import {
  Alert,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTimer } from '../context/TimerContext';
import { ThemeContext } from '../theme/ThemeContext';

interface CollapsibleTimerProps {
  activityId: string;
  activityName: string;
  defaultExpanded?: boolean;
}

export default function CollapsibleTimer({
  activityId,
  activityName,
  defaultExpanded = false,
}: CollapsibleTimerProps) {
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  const {
    timer,
    startTimer,
    switchTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    setTimerMode,
    setTargetSeconds,
    formatTime,
  } = useTimer();

  // Check if this activity owns the timer
  const isTimerOwner = timer.activityId === activityId;
  const isTimerRunning = isTimerOwner && timer.isRunning;
  const timerSeconds = isTimerOwner ? timer.seconds : 0;

  const [isExpanded, setIsExpanded] = useState(defaultExpanded || isTimerRunning);

  // Auto-expand timer when running for this activity
  useEffect(() => {
    if (isTimerRunning) {
      setIsExpanded(true);
    }
  }, [isTimerRunning]);

  const handleStartTimer = () => {
    const success = startTimer(activityId, activityName);
    if (!success) {
      Alert.alert(
        'Timer Already Running',
        `You have a timer running for "${timer.activityName}". Only one timer can run at a time.`,
        [
          { text: 'Keep Current Timer', style: 'cancel' },
          {
            text: 'Switch to This Activity',
            onPress: () => {
              switchTimer(activityId, activityName);
            },
          },
        ]
      );
    }
  };

  const handlePauseTimer = () => {
    pauseTimer();
  };

  const handleResumeTimer = () => {
    resumeTimer();
  };

  const handleResetTimer = () => {
    resetTimer();
  };

  const isPaused =
    isTimerOwner &&
    !timer.isRunning &&
    ((timer.mode === 'countUp' && timerSeconds > 0) ||
      (timer.mode === 'countDown' &&
        timerSeconds < timer.targetSeconds &&
        timerSeconds > 0));

  const showResumeButton = isPaused;

  return (
    <View
      className={`rounded-lg ${
        isDark ? 'bg-gray-800' : 'bg-white'
      } shadow-sm overflow-hidden`}
    >
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
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
          {isPaused && (
            <Text className="ml-3 text-sm" style={{ color: '#EAB308' }}>
              (paused)
            </Text>
          )}
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={isDark ? '#9CA3AF' : '#6B7280'}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View className="px-4 pb-4">
          {/* Mode Toggle */}
          <View className="flex-row justify-center mb-4">
            <TouchableOpacity
              onPress={() => setTimerMode('countUp')}
              disabled={timer.isRunning}
              className={`px-4 py-2 rounded-l-lg ${
                timer.mode === 'countUp'
                  ? 'bg-blue-500'
                  : isDark
                    ? 'bg-gray-700'
                    : 'bg-gray-200'
              }`}
            >
              <Text
                className={`font-semibold ${
                  timer.mode === 'countUp'
                    ? 'text-white'
                    : isDark
                      ? 'text-gray-300'
                      : 'text-gray-600'
                }`}
              >
                Count Up
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTimerMode('countDown')}
              disabled={timer.isRunning}
              className={`px-4 py-2 rounded-r-lg ${
                timer.mode === 'countDown'
                  ? 'bg-blue-500'
                  : isDark
                    ? 'bg-gray-700'
                    : 'bg-gray-200'
              }`}
            >
              <Text
                className={`font-semibold ${
                  timer.mode === 'countDown'
                    ? 'text-white'
                    : isDark
                      ? 'text-gray-300'
                      : 'text-gray-600'
                }`}
              >
                Count Down
              </Text>
            </TouchableOpacity>
          </View>

          {/* Countdown Duration Input */}
          {timer.mode === 'countDown' && !timer.isRunning && (
            <View className="flex-row justify-center items-center mb-4">
              <TextInput
                value={
                  Math.floor(timer.targetSeconds / 60) > 0
                    ? Math.floor(timer.targetSeconds / 60).toString()
                    : ''
                }
                onChangeText={text => {
                  const mins = parseInt(text) || 0;
                  const secs = timer.targetSeconds % 60;
                  setTargetSeconds(mins * 60 + secs);
                }}
                keyboardType="numeric"
                maxLength={3}
                className={`w-16 px-3 py-2 border rounded-lg ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                style={{ textAlign: 'center' }}
                placeholder="0"
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              <Text
                className={`mx-2 text-base ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                min
              </Text>
              <TextInput
                value={
                  timer.targetSeconds % 60 > 0
                    ? (timer.targetSeconds % 60).toString()
                    : ''
                }
                onChangeText={text => {
                  const secs = Math.min(parseInt(text) || 0, 59);
                  const mins = Math.floor(timer.targetSeconds / 60);
                  setTargetSeconds(mins * 60 + secs);
                }}
                keyboardType="numeric"
                maxLength={2}
                className={`w-16 px-3 py-2 border rounded-lg ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                style={{ textAlign: 'center' }}
                placeholder="0"
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              <Text
                className={`ml-2 text-base ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                sec
              </Text>
            </View>
          )}

          <Text
            className={`text-4xl font-mono text-center mb-4 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {formatTime(
              isTimerOwner
                ? timerSeconds
                : timer.mode === 'countDown'
                  ? timer.targetSeconds
                  : 0
            )}
          </Text>

          {/* Show notice if timer is running on another activity */}
          {timer.isRunning && !isTimerOwner && (
            <Text
              className={`text-sm text-center mb-3 ${
                isDark ? 'text-yellow-400' : 'text-yellow-600'
              }`}
            >
              Timer running on: {timer.activityName}
            </Text>
          )}

          <View className="flex-row justify-center space-x-4">
            {!isTimerRunning ? (
              <TouchableOpacity
                onPress={showResumeButton ? handleResumeTimer : handleStartTimer}
                className="bg-green-500 px-6 py-2 rounded-lg"
                style={{ minWidth: 102, alignItems: 'center' }}
              >
                <Text className="text-white font-semibold">
                  {showResumeButton ? 'Resume' : 'Start'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handlePauseTimer}
                className="bg-yellow-500 px-6 py-2 rounded-lg"
                style={{ minWidth: 102, alignItems: 'center' }}
              >
                <Text className="text-white font-semibold">Pause</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleResetTimer}
              disabled={!isTimerOwner}
              className={`px-6 py-2 rounded-lg ${isTimerOwner ? 'bg-red-500' : 'bg-gray-400'}`}
              style={{ minWidth: 80, alignItems: 'center' }}
            >
              <Text className="text-white font-semibold">Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
