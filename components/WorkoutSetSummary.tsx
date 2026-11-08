import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function WorkoutSetSummary({
  label = 'Sets',
  completed,
  total,
}: {
  label?: string;
  completed: number;
  total: number;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${completed} of ${total} complete`}
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 8,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
        {label} · {total}
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '600',
          color:
            total > 0 && completed === total
              ? colors.success.main
              : colors.textSecondary,
        }}
      >
        {completed}/{total} complete
      </Text>
    </View>
  );
}
