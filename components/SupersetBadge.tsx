import React from 'react';
import { Text, View, ViewStyle } from 'react-native';

interface SupersetBadgeProps {
  label: string;
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

const PURPLE = '#8B5CF6';

/**
 * Reusable purple badge for superset/triset/giant set labels
 */
export default function SupersetBadge({
  label,
  size = 'small',
  style,
}: SupersetBadgeProps) {
  const isSmall = size === 'small';

  return (
    <View
      style={[
        {
          backgroundColor: PURPLE,
          paddingHorizontal: isSmall ? 8 : 12,
          paddingVertical: isSmall ? 2 : 4,
          borderRadius: isSmall ? 8 : 12,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: '#fff',
          fontSize: isSmall ? 11 : 12,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </View>
  );
}
