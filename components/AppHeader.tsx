import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

interface AppHeaderProps {
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}

export default function AppHeader({
  leftAction,
  rightAction,
  children,
}: AppHeaderProps) {
  const { colors } = useTheme();
  const { insets, isLandscape } = useResponsiveLayout();

  return (
    <View
      className="border-b border-gray-200 flex-row items-center"
      style={{
        paddingTop: insets.top + 8,
        paddingBottom: isLandscape ? 8 : 20,
        paddingLeft: Math.max(16, insets.left),
        paddingRight: Math.max(16, insets.right),
        backgroundColor: colors.surface,
        borderBottomColor: colors.border,
      }}
    >
      {/* Left: Optional (spacer if no action) */}
      {leftAction ? leftAction : <View style={{ width: 40 }} />}

      {/* Center: Children */}
      <View className="flex-1 items-center justify-center">{children}</View>

      {/* Right: Optional action (settings now lives in the footer tab bar) */}
      {rightAction ? rightAction : <View style={{ width: 40 }} />}
    </View>
  );
}

import { Text } from 'react-native';

interface AppHeaderTitleProps {
  title: string;
  subtitle?: string;
}

export const AppHeaderTitle = ({ title, subtitle }: AppHeaderTitleProps) => {
  const { colors } = useTheme();

  return (
    <View className="flex-1 items-center">
      <Text className="text-2xl font-bold" style={{ color: colors.text }}>
        {title}
      </Text>
      {subtitle && (
        <Text
          className="mt-1"
          style={{
            color: colors.textSecondary,
            fontSize: 14,
            lineHeight: 18,
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
};
