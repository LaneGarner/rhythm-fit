import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function SetCompletionButton({
  completed,
  onPress,
  label,
  marginTop = 20,
}: {
  completed: boolean;
  onPress: () => void;
  label: string;
  marginTop?: number;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      className="px-4 py-4 rounded-lg"
      style={{
        marginTop,
        backgroundColor: colors.surface,
        borderWidth: 2,
        borderColor: completed ? colors.success.main : colors.border,
      }}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${completed ? 'completed' : 'incomplete'}. Tap to ${completed ? 'mark incomplete' : 'mark complete'}`}
      accessibilityState={{ checked: completed }}
    >
      <Text
        className="text-center font-semibold text-lg"
        style={{
          color: completed ? colors.success.main : colors.textSecondary,
        }}
      >
        {completed ? 'Completed' : 'Mark Complete'}
      </Text>
    </TouchableOpacity>
  );
}
