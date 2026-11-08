import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface CompletedDividerProps {
  count: number;
}

export const CompletedDivider: React.FC<CompletedDividerProps> = ({
  count,
}) => {
  const { colors } = useTheme();

  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={`Completed, ${count}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 12,
      }}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      <Text
        style={{
          paddingHorizontal: 12,
          fontSize: 14,
          fontWeight: '600',
          color: colors.textSecondary,
        }}
      >
        Completed · {count}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
    </View>
  );
};
