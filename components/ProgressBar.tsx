import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface ProgressBarProps {
  completed: number;
  total: number;
  isDark?: boolean; // Kept for backward compatibility but not used
}

export default function ProgressBar({ completed, total }: ProgressBarProps) {
  const { colors } = useTheme();
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const allCompleted = total > 0 && completed === total;
  const fillColor = allCompleted ? colors.success.main : colors.primary.main;

  return (
    <View
      style={{
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        position: 'relative',
      }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: completed }}
      accessibilityLabel={`${completed} of ${total} completed`}
    >
      {/* Background track with gray border */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.surface,
          borderRadius: 3,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      />
      {/* Colored fill with matching border overlay */}
      {percentage > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: `${percentage}%`,
            backgroundColor: fillColor,
            borderRadius: 3,
            borderWidth: 1,
            borderColor: fillColor,
          }}
        />
      )}
    </View>
  );
}
