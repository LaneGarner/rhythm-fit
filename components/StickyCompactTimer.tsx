import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Animated, Text, TouchableOpacity, View } from 'react-native';
import { useTimer } from '../context/TimerContext';
import { useTheme } from '../theme/ThemeContext';

const STICKY_HEADER_HEIGHT = 42;
const APPEAR_START = 160;
const APPEAR_END = 180;

interface StickyCompactTimerProps {
  activityId: string;
  activityName: string;
  scrollY: Animated.Value;
  isExpanded: boolean;
}

export default function StickyCompactTimer({
  activityId,
  activityName,
  scrollY,
  isExpanded,
}: StickyCompactTimerProps) {
  const { colors } = useTheme();
  const {
    timer,
    startTimer,
    switchTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    formatTime,
  } = useTimer();

  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      setIsSticky(value >= APPEAR_END);
    });
    return () => scrollY.removeListener(id);
  }, [scrollY]);

  if (!isExpanded) return null;

  const isTimerOwner = timer.activityId === activityId;
  const isTimerRunning = isTimerOwner && timer.isRunning;
  const timerSeconds = isTimerOwner ? timer.seconds : 0;
  const isPaused =
    isTimerOwner &&
    !timer.isRunning &&
    ((timer.mode === 'countUp' && timerSeconds > 0) ||
      (timer.mode === 'countDown' &&
        timerSeconds < timer.targetSeconds &&
        timerSeconds > 0));

  const opacity = scrollY.interpolate({
    inputRange: [APPEAR_START, APPEAR_END],
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
        top: STICKY_HEADER_HEIGHT - 1,
        left: 0,
        right: 0,
        zIndex: 99,
        opacity,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
      pointerEvents={isSticky ? 'auto' : 'none'}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons
          name="timer-outline"
          size={18}
          color={colors.textSecondary}
          style={{ marginRight: 6 }}
        />
        <Text
          style={{
            fontSize: 20,
            fontWeight: '600',
            fontVariant: ['tabular-nums'],
            color: colors.text,
          }}
        >
          {formatTime(
            isTimerOwner
              ? timerSeconds
              : timer.mode === 'countDown'
                ? timer.targetSeconds
                : 0
          )}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {!isTimerRunning ? (
          <TouchableOpacity
            onPress={isPaused ? resumeTimer : handleStart}
            style={{
              backgroundColor: '#22c55e',
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 6,
            }}
            accessibilityRole="button"
            accessibilityLabel={isPaused ? 'Resume timer' : 'Start timer'}
          >
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
              {isPaused ? 'Resume' : 'Start'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={pauseTimer}
            style={{
              backgroundColor: '#eab308',
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 6,
            }}
            accessibilityRole="button"
            accessibilityLabel="Pause timer"
          >
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
              Pause
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={resetTimer}
          disabled={!isTimerOwner}
          style={{
            backgroundColor: isTimerOwner ? '#ef4444' : '#9ca3af',
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 6,
          }}
          accessibilityRole="button"
          accessibilityLabel="Reset timer"
          accessibilityState={{ disabled: !isTimerOwner }}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
            Reset
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
