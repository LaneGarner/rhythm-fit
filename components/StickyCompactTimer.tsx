import React from 'react';
import {
  Alert,
  Animated,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import TimerDigits from './TimerDigits';
import { useTimer } from '../context/TimerContext';
import { useTheme } from '../theme/ThemeContext';

interface StickyCompactTimerProps {
  activityId: string;
  activityName: string;
  scrollY: Animated.Value;
  onSkipRest?: () => void;
  threshold: number | null;
}

export default function StickyCompactTimer({
  activityId,
  activityName,
  scrollY,
  onSkipRest,
  threshold,
}: StickyCompactTimerProps) {
  const { colors, colorScheme } = useTheme();
  const backgroundColor =
    colorScheme === 'dark' ? colors.background : colors.surface;
  const { fontScale } = useWindowDimensions();
  const actionButtonWidth = Math.ceil(32 + 56 * fontScale);
  const {
    timer,
    startTimer,
    switchTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    formatTime,
  } = useTimer();

  const isTimerOwner = timer.activityId === activityId;
  const isTimerRunning = isTimerOwner && timer.isRunning;
  const timerSeconds = isTimerOwner ? timer.seconds : 0;
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

  const dockAt = Math.max(1, threshold ?? 1);
  const digitsSize =
    threshold === null
      ? 72
      : scrollY.interpolate({
          inputRange: [Math.max(0, dockAt - 80), dockAt],
          outputRange: [72, 32],
          extrapolate: 'clamp',
        });

  const topPadding =
    threshold === null
      ? 0
      : scrollY.interpolate({
          inputRange: [Math.max(0, dockAt - 80), dockAt],
          outputRange: [0, 4],
          extrapolate: 'clamp',
        });

  const handleStart = () => {
    const success = startTimer(activityId, activityName);
    if (!success) {
      Alert.alert(
        'Timer Already Running',
        `You have a timer running for "${timer.activityName}". Only one timer can run at a time.`,
        [
          { text: 'Keep Current Timer', style: 'cancel' },
          {
            text: 'Switch to This Activity',
            onPress: () => switchTimer(activityId, activityName),
          },
        ]
      );
    }
  };

  return (
    <Animated.View
      style={{
        backgroundColor,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingTop: topPadding,
        paddingBottom: 10,
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 4,
      }}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}
      >
        <TimerDigits
          animatedSize={digitsSize}
          compact
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
        {timer.mode === 'emom' &&
          isTimerOwner &&
          timer.emomCurrentRound > 0 && (
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: colors.textSecondary,
                marginLeft: 8,
              }}
              accessibilityLabel={`Round ${timer.emomCurrentRound} of ${timer.emomTotalRounds}`}
            >
              R{timer.emomCurrentRound}/{timer.emomTotalRounds}
            </Text>
          )}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {!isTimerRunning ? (
          <TouchableOpacity
            onPress={isPaused ? resumeTimer : handleStart}
            style={{
              backgroundColor,
              borderWidth: 2,
              borderColor: colors.success.main,
              paddingHorizontal: 14,
              width: actionButtonWidth,
              alignItems: 'center',
              paddingVertical: 6,
              borderRadius: 6,
            }}
            accessibilityRole="button"
            accessibilityLabel={isPaused ? 'Resume timer' : 'Start timer'}
          >
            <Text
              style={{
                color: colors.success.main,
                fontWeight: '600',
                fontSize: 13,
              }}
            >
              {isPaused ? 'Resume' : 'Start'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={pauseTimer}
            style={{
              backgroundColor,
              borderWidth: 2,
              borderColor: colors.warning.main,
              paddingHorizontal: 14,
              width: actionButtonWidth,
              alignItems: 'center',
              paddingVertical: 6,
              borderRadius: 6,
            }}
            accessibilityRole="button"
            accessibilityLabel="Pause timer"
          >
            <Text
              style={{
                color: colors.warning.main,
                fontWeight: '600',
                fontSize: 13,
              }}
            >
              Pause
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onSkipRest ?? resetTimer}
          disabled={!isTimerOwner}
          style={{
            backgroundColor,
            borderWidth: 2,
            borderColor: isTimerOwner ? colors.error.main : colors.border,
            width: actionButtonWidth,
            alignItems: 'center',
            paddingVertical: 6,
            borderRadius: 6,
          }}
          accessibilityRole="button"
          accessibilityLabel={onSkipRest ? 'Skip rest' : 'Reset timer'}
          accessibilityState={{ disabled: !isTimerOwner }}
        >
          <Text
            style={{
              color: isTimerOwner ? colors.error.main : colors.textSecondary,
              fontWeight: '600',
              fontSize: 13,
            }}
          >
            {onSkipRest ? 'Skip' : 'Reset'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
