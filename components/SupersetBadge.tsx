import React from 'react';
import { Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface SupersetBadgeProps {
  label: string;
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

/**
 * Reusable badge for superset/triset/giant set labels
 */
export default function SupersetBadge({
  label,
  size = 'small',
  style,
}: SupersetBadgeProps) {
  const { colors } = useTheme();
  const isSmall = size === 'small';

  return (
    <View
      style={[
        {
          backgroundColor: colors.accent.main,
          paddingHorizontal: isSmall ? 8 : 12,
          paddingVertical: isSmall ? 2 : 4,
          borderRadius: isSmall ? 8 : 12,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: colors.textInverse,
          fontSize: isSmall ? 11 : 12,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </View>
  );
}
