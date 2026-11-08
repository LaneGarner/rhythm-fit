import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useWorkoutSession } from '../context/WorkoutSessionContext';
import { useTimer } from '../context/TimerContext';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WorkoutSessionBar({
  navigationRef,
}: {
  navigationRef: React.RefObject<any>;
}) {
  const { session, current, resume } = useWorkoutSession();
  const { timer, formatTime } = useTimer();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [, redraw] = useState(0);
  useEffect(
    () =>
      navigationRef.current?.addListener('state', () =>
        redraw(value => value + 1)
      ),
    [navigationRef]
  );
  if (!session || !current) return null;
  const route = navigationRef.current?.getCurrentRoute();
  const atCurrent =
    route?.name === current.route &&
    route?.params?.activityId === current.params.activityId &&
    route?.params?.supersetId === current.params.supersetId;
  if (atCurrent) return null;
  const activeTimer =
    timer.activityId === current.id &&
    timer.mode === 'countDown' &&
    timer.seconds > 0;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Resume session: ${current.label}`}
      onPress={() => {
        const item = resume();
        if (item)
          navigationRef.current?.navigate('Main', {
            screen: 'Weekly',
            params: { screen: item.route, params: item.params },
          });
      }}
      style={{
        position: 'absolute',
        bottom: insets.bottom + 62,
        left: Math.max(12, insets.left),
        right: Math.max(12, insets.right),
        zIndex: 50,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 14,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}
        >
          {current.label}
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
          {activeTimer
            ? `${timer.isRunning ? 'Rest' : 'Paused'} · ${formatTime(timer.seconds)}`
            : 'Ready'}{' '}
          · {session.index + 1} of {session.items.length}
        </Text>
      </View>
      <Text style={{ color: colors.primary.main, fontWeight: '600' }}>
        Resume
      </Text>
    </TouchableOpacity>
  );
}
