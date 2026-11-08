import React from 'react';
import { Platform, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function TimerDigits({
  value,
  compact = false,
}: {
  value: string;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.5}
      style={{
        fontSize: compact ? 40 : 72,
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
    </Text>
  );
}
