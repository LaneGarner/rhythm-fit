import React from 'react';
import { View } from 'react-native';

interface ProgressBarProps {
  completed: number;
  total: number;
  isDark: boolean;
}

export default function ProgressBar({
  completed,
  total,
  isDark,
}: ProgressBarProps) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const allCompleted = total > 0 && completed === total;
  const fillColor = allCompleted ? '#22C55E' : '#3B82F6';
  const borderColorEmpty = isDark ? '#4B5563' : '#d1d5db';

  return (
    <View
      style={{
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Background track with gray border */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isDark ? '#1f2937' : '#fff',
          borderRadius: 3,
          borderWidth: 1,
          borderColor: borderColorEmpty,
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
