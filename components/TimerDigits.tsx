import React from 'react';
import { Animated, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function TimerDigits({
  value,
  compact = false,
  animatedSize,
}: {
  value: string;
  compact?: boolean;
  animatedSize?: number | Animated.AnimatedInterpolation<number>;
}) {
  const { colors } = useTheme();
  return (
    <Animated.Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.5}
      style={{
        fontSize: animatedSize ?? (compact ? 40 : 72),
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontWeight: '500',
        fontVariant: ['tabular-nums'],
        textAlign: 'center',
        flexShrink: 1,
        color: colors.text,
        marginBottom: compact ? 0 : 16,
      }}
    >
      {value}
    </Animated.Text>
  );
}
