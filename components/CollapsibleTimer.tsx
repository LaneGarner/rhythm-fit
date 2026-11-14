import React, { useState } from 'react';
import DurationPickerModal from './DurationPickerModal';
import {
  Keyboard,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTimer } from '../context/TimerContext';
import { useTheme } from '../theme/ThemeContext';

interface CollapsibleTimerProps {
  activityId: string;
  restToggle?: {
    enabled: boolean;
    onToggle: (value: boolean) => void;
  };
}

export default function CollapsibleTimer({
  activityId,
  restToggle,
}: CollapsibleTimerProps) {
  const { colors } = useTheme();
  const {
    timer,
    setTimerMode,
    setTargetSeconds,
    setEmomInterval,
    setEmomRounds,
  } = useTimer();
  const isTimerOwner = timer.activityId === activityId;
  const [editingDuration, setEditingDuration] = useState(false);
  const isEmom = timer.mode === 'emom';
  const duration = isEmom ? timer.emomIntervalSeconds : timer.targetSeconds;
  const durationLabel = isEmom ? 'EMOM interval' : 'Countdown duration';
  const showDuration =
    isEmom ||
    (timer.mode === 'countDown' && !(isTimerOwner && timer.activityCountdown));

  return (
    <View className="px-4 pt-2 pb-1">
      {/* Mode Toggle */}
      <View className="flex-row justify-center">
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

      {showDuration && (
        <View className="items-center mt-5 mb-1">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={durationLabel}
            accessibilityValue={{
              text: `${Math.floor(duration / 60)} minutes, ${duration % 60} seconds`,
            }}
            accessibilityState={{ disabled: timer.isRunning }}
            disabled={timer.isRunning}
            onPress={() => setEditingDuration(true)}
            className="px-4 py-2 border rounded-lg"
            style={{
              backgroundColor: colors.inputBackground,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text }}>
              {Math.floor(duration / 60)} min{' '}
              {String(duration % 60).padStart(2, '0')} sec
              {isEmom ? ' interval' : ''}
            </Text>
          </TouchableOpacity>
          {editingDuration && (
            <DurationPickerModal
              visible
              value={Math.min(duration, 99 * 60 + 59)}
              maxMinutes={99}
              onCancel={() => setEditingDuration(false)}
              onConfirm={seconds => {
                if (!timer.isRunning) {
                  if (isEmom) setEmomInterval(seconds ?? 1);
                  else setTargetSeconds(seconds ?? 0);
                }
                setEditingDuration(false);
              }}
            />
          )}
        </View>
      )}

      {isEmom && (
        <View className="mt-2 mb-1">
          <View className="flex-row justify-center items-center">
            <TextInput
              editable={!timer.isRunning}
              accessibilityState={{ disabled: timer.isRunning }}
              value={
                timer.emomTotalRounds > 0 ? String(timer.emomTotalRounds) : ''
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
      {timer.mode === 'emom' && isTimerOwner && timer.emomCurrentRound > 0 && (
        <Text
          className="text-center text-base font-semibold mb-1"
          style={{ color: colors.textSecondary }}
          accessibilityLabel={`Round ${timer.emomCurrentRound} of ${timer.emomTotalRounds}`}
        >
          Round {timer.emomCurrentRound} of {timer.emomTotalRounds}
        </Text>
      )}

      {/* Show notice if timer is running on another activity */}
      {timer.isRunning && !isTimerOwner && (
        <Text
          className="text-sm text-center mb-3"
          style={{ color: colors.warning.main }}
        >
          Timer running on: {timer.activityName}
        </Text>
      )}

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
              <Text className="text-sm" style={{ color: colors.textSecondary }}>
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
