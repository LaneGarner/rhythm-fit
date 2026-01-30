import React from 'react';
import { Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface HeaderButtonProps {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}

/**
 * Reusable header button for Back/Edit actions
 * Consistent blue color and styling across all screens
 */
export default function HeaderButton({
  label,
  onPress,
  style,
}: HeaderButtonProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      onPress={onPress}
      style={[{ paddingVertical: 4, paddingHorizontal: 8 }, style]}
    >
      <Text
        style={{
          color: colors.primary.main,
          fontSize: 17,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
