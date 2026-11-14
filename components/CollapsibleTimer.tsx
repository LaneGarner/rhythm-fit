import React, { useRef } from 'react';
import {
  Alert,
  Keyboard,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import TimerDigits from './TimerDigits';
import { useTimer } from '../context/TimerContext';
import { useTheme } from '../theme/ThemeContext';

interface CollapsibleTimerProps {
  activityId: string;
  activityName: string;
  onClockLayout?: (clock: View) => void;
  restToggle?: {
    enabled: boolean;
    onToggle: (value: boolean) => void;
  };
}

export default function CollapsibleTimer({
  activityId,
  activityName,
  onClockLayout,
  restToggle,
}: CollapsibleTimerProps) {
  const clockRef = useRef<View>(null);
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const actionButtonWidth = Math.ceil(52 + 64 * fontScale);

  const {
    timer,
    startTimer,
    switchTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    setTimerMode,
    setTargetSeconds,
    setEmomInterval,
    setEmomRounds,
    formatTime,
  } = useTimer();

  // Check if this activity owns the timer
  const isTimerOwner = timer.activityId === activityId;
  const isTimerRunning = isTimerOwner && timer.isRunning;
  const timerSeconds = isTimerOwner ? timer.seconds : 0;

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
        timerSeconds > 0) ||
      (timer.mode === 'emom' &&
        timer.emomCurrentRound > 0 &&
        timerSeconds < timer.emomIntervalSeconds &&
        timerSeconds > 0));

  const showResumeButton = isPaused;

  return (
    <View className="px-4 pt-2 pb-4">
      {/* Mode Toggle */}
      <View className="flex-row justify-center mb-4">
        <TouchableOpacity
          onPress={() => setTimerMode('countUp')}
          disabled={timer.isRunning}
          className="px-4 py-2 rounded-l-lg"
          style={{
            backgroundColor:
              timer.mode === 'countUp'
                ? colors.primary.main
                : colors.backgroundTertiary,
          }}
          accessibilityRole="button"
          accessibilityLabel={`Count up timer${timer.mode === 'countUp' ? ', selected' : ''}`}
          accessibilityState={{
            selected: timer.mode === 'countUp',
            disabled: timer.isRunning,
          }}
        >
          <Text
            className="font-semibold"
            style={{
              color:
                timer.mode === 'countUp'
                  ? colors.textInverse
                  : colors.textSecondary,
            }}
          >
            Count Up
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTimerMode('countDown')}
          disabled={timer.isRunning}
          className="px-4 py-2"
          style={{
            backgroundColor:
              timer.mode === 'countDown'
                ? colors.primary.main
                : colors.backgroundTertiary,
          }}
          accessibilityRole="button"
          accessibilityLabel={`Count down timer${timer.mode === 'countDown' ? ', selected' : ''}`}
          accessibilityState={{
            selected: timer.mode === 'countDown',
            disabled: timer.isRunning,
          }}
        >
          <Text
            className="font-semibold"
            style={{
              color:
                timer.mode === 'countDown'
                  ? colors.textInverse
                  : colors.textSecondary,
            }}
          >
            Count Down
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTimerMode('emom')}
          disabled={timer.isRunning}
          className="px-4 py-2 rounded-r-lg"
          style={{
            backgroundColor:
              timer.mode === 'emom'
                ? colors.primary.main
                : colors.backgroundTertiary,
          }}
          accessibilityRole="button"
          accessibilityLabel={`EMOM interval timer${timer.mode === 'emom' ? ', selected' : ''}`}
          accessibilityState={{
            selected: timer.mode === 'emom',
            disabled: timer.isRunning,
          }}
        >
          <Text
            className="font-semibold"
            style={{
              color:
                timer.mode === 'emom'
                  ? colors.textInverse
                  : colors.textSecondary,
            }}
          >
            EMOM
          </Text>
        </TouchableOpacity>
      </View>

      {/* Countdown Duration Input */}
      {timer.mode === 'countDown' && (
        <View className="flex-row justify-center items-center mb-4">
          <TextInput
            accessibilityLabel="Countdown minutes"
            editable={!timer.isRunning}
            accessibilityState={{ disabled: timer.isRunning }}
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
            className="w-16 px-3 py-2 border rounded-lg"
            style={{
              textAlign: 'center',
              backgroundColor: colors.inputBackground,
              borderColor: colors.border,
              color: colors.text,
            }}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          <Text
            className="mx-2 text-base"
            style={{ color: colors.textSecondary }}
          >
            min
          </Text>
          <TextInput
            accessibilityLabel="Countdown seconds"
            editable={!timer.isRunning}
            accessibilityState={{ disabled: timer.isRunning }}
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
            className="w-16 px-3 py-2 border rounded-lg"
            style={{
              textAlign: 'center',
              backgroundColor: colors.inputBackground,
              borderColor: colors.border,
              color: colors.text,
            }}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          <Text
            className="ml-2 text-base"
            style={{ color: colors.textSecondary }}
          >
            sec
          </Text>
        </View>
      )}

      {/* EMOM Duration + Rounds Input */}
      {timer.mode === 'emom' && (
        <View className="mb-4">
          <View className="flex-row justify-center items-center mb-3">
            <TextInput
              editable={!timer.isRunning}
              accessibilityState={{ disabled: timer.isRunning }}
              value={
                Math.floor(timer.emomIntervalSeconds / 60) > 0
                  ? Math.floor(timer.emomIntervalSeconds / 60).toString()
                  : ''
              }
              onChangeText={text => {
                const mins = parseInt(text) || 0;
                const secs = timer.emomIntervalSeconds % 60;
                setEmomInterval(mins * 60 + secs);
              }}
              keyboardType="numeric"
              maxLength={3}
              className="w-16 px-3 py-2 border rounded-lg"
              style={{
                textAlign: 'center',
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
                color: colors.text,
              }}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              accessibilityLabel="Interval minutes"
            />
            <Text
              className="mx-2 text-base"
              style={{ color: colors.textSecondary }}
            >
              min
            </Text>
            <TextInput
              editable={!timer.isRunning}
              accessibilityState={{ disabled: timer.isRunning }}
              value={
                timer.emomIntervalSeconds % 60 > 0
                  ? (timer.emomIntervalSeconds % 60).toString()
                  : ''
              }
              onChangeText={text => {
                const secs = Math.min(parseInt(text) || 0, 59);
                const mins = Math.floor(timer.emomIntervalSeconds / 60);
                setEmomInterval(mins * 60 + secs);
              }}
              keyboardType="numeric"
              maxLength={2}
              className="w-16 px-3 py-2 border rounded-lg"
              style={{
                textAlign: 'center',
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
                color: colors.text,
              }}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              accessibilityLabel="Interval seconds"
            />
            <Text
              className="ml-2 text-base"
              style={{ color: colors.textSecondary }}
            >
              sec interval
            </Text>
          </View>
          <View className="flex-row justify-center items-center">
            <TextInput
              editable={!timer.isRunning}
              accessibilityState={{ disabled: timer.isRunning }}
              value={
                timer.emomTotalRounds > 0
                  ? String(timer.emomTotalRounds)
                  : ''
              }
              onChangeText={text => {
                setEmomRounds(parseInt(text) || 0);
              }}
              keyboardType="numeric"
              maxLength={3}
              className="w-16 px-3 py-2 border rounded-lg"
              style={{
                textAlign: 'center',
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
                color: colors.text,
              }}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              accessibilityLabel="Total rounds"
            />
            <Text
              className="ml-2 text-base"
              style={{ color: colors.textSecondary }}
            >
              rounds
            </Text>
          </View>
        </View>
      )}

      {/* Round indicator (EMOM while running/paused) */}
      {timer.mode === 'emom' &&
        isTimerOwner &&
        timer.emomCurrentRound > 0 && (
          <Text
            className="text-center text-base font-semibold mb-1"
            style={{ color: colors.textSecondary }}
            accessibilityLabel={`Round ${timer.emomCurrentRound} of ${timer.emomTotalRounds}`}
          >
            Round {timer.emomCurrentRound} of {timer.emomTotalRounds}
          </Text>
        )}

      <View
        ref={clockRef}
        collapsable={false}
        onLayout={() => {
          if (clockRef.current) onClockLayout?.(clockRef.current);
        }}
      >
        <TimerDigits
          value={formatTime(
            isTimerOwner
              ? timerSeconds
              : timer.mode === 'countDown'
                ? timer.targetSeconds
                : timer.mode === 'emom'
                  ? timer.emomIntervalSeconds
                  : 0
          )}
        />
      </View>

      {/* Show notice if timer is running on another activity */}
      {timer.isRunning && !isTimerOwner && (
        <Text
          className="text-sm text-center mb-3"
          style={{ color: colors.warning.main }}
        >
          Timer running on: {timer.activityName}
        </Text>
      )}

      <View className="flex-row justify-center space-x-4">
        {!isTimerRunning ? (
          <TouchableOpacity
            onPress={
              showResumeButton ? handleResumeTimer : handleStartTimer
            }
            className="px-6 py-2 rounded-lg"
            style={{
              width: actionButtonWidth,
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderWidth: 2,
              borderColor: colors.success.main,
            }}
            accessibilityRole="button"
            accessibilityLabel={
              showResumeButton ? 'Resume timer' : 'Start timer'
            }
          >
            <Text
              className="font-semibold"
              style={{ color: colors.success.main }}
            >
              {showResumeButton ? 'Resume' : 'Start'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handlePauseTimer}
            className="px-6 py-2 rounded-lg"
            style={{
              width: actionButtonWidth,
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderWidth: 2,
              borderColor: colors.warning.main,
            }}
            accessibilityRole="button"
            accessibilityLabel="Pause timer"
          >
            <Text
              className="font-semibold"
              style={{ color: colors.warning.main }}
            >
              Pause
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleResetTimer}
          disabled={!isTimerOwner}
          className="px-6 py-2 rounded-lg"
          style={{
            minWidth: 80,
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderWidth: 2,
            borderColor: isTimerOwner ? colors.error.main : colors.border,
          }}
          accessibilityRole="button"
          accessibilityLabel="Reset timer"
          accessibilityState={{ disabled: !isTimerOwner }}
        >
          <Text
            className="font-semibold"
            style={{
              color: isTimerOwner
                ? colors.error.main
                : colors.textSecondary,
            }}
          >
            Reset
          </Text>
        </TouchableOpacity>
      </View>

      {restToggle && (
        <View
          className="mt-4 pt-4"
          style={{ borderTopWidth: 1, borderTopColor: colors.border }}
        >
          <View className="flex-row items-center justify-between">
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text
                className="text-base font-medium"
                style={{ color: colors.text }}
              >
                Auto rest countdown
              </Text>
              <Text
                className="text-sm"
                style={{ color: colors.textSecondary }}
              >
                Start automatically after completed sets
              </Text>
            </View>
            <Switch
              value={restToggle.enabled}
              onValueChange={restToggle.onToggle}
              trackColor={{
                false: colors.border,
                true: colors.primary.main,
              }}
              accessibilityLabel="Auto rest countdown"
            />
          </View>
        </View>
      )}
    </View>
  );
}
