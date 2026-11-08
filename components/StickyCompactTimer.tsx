import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState, useRef } from 'react';
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
  isExpanded: boolean;
  clockBottom: number | null;
  headerHeight: number;
}

export default function StickyCompactTimer({
  activityId,
  activityName,
  scrollY,
  isExpanded,
  clockBottom,
  headerHeight,
}: StickyCompactTimerProps) {
  const { colors } = useTheme();
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

  const threshold =
    clockBottom === null ? 1 : Math.max(1, clockBottom - headerHeight);
  const [isSticky, setIsSticky] = useState(false);
  const lastScroll = useRef(0);

  useEffect(() => {
    setIsSticky(lastScroll.current >= threshold);
    const id = scrollY.addListener(({ value }) => {
      lastScroll.current = value;
      setIsSticky(value >= threshold);
    });
    return () => scrollY.removeListener(id);
  }, [scrollY, threshold]);

  if (!isExpanded || clockBottom === null) return null;

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

  const opacity = scrollY.interpolate({
    inputRange: [threshold - 0.001, threshold],
    outputRange: [0, 1],
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
        position: 'absolute',
        top: headerHeight - 2,
        left: 0,
        right: 0,
        zIndex: 99,
        opacity,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingVertical: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
      accessibilityElementsHidden={!isSticky}
      importantForAccessibility={isSticky ? 'auto' : 'no-hide-descendants'}
      pointerEvents={isSticky ? 'auto' : 'none'}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}
      >
        <Ionicons
          name="timer-outline"
          size={24}
          color={colors.textSecondary}
          style={{ marginRight: 6 }}
        />
        <TimerDigits
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
              backgroundColor: colors.surface,
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
              backgroundColor: colors.surface,
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
          onPress={resetTimer}
          disabled={!isTimerOwner}
          style={{
            backgroundColor: colors.surface,
            borderWidth: 2,
            borderColor: isTimerOwner ? colors.error.main : colors.border,
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 6,
          }}
          accessibilityRole="button"
          accessibilityLabel="Reset timer"
          accessibilityState={{ disabled: !isTimerOwner }}
        >
          <Text
            style={{
              color: isTimerOwner ? colors.error.main : colors.textSecondary,
              fontWeight: '600',
              fontSize: 13,
            }}
          >
            Reset
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
