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

      {/*
        Right: optional action. Settings moved to the footer tab bar; the
        fallback spacer keeps the former settings-icon footprint (28px icon +
        p-2 = 44px) so the centered title stays exactly where it was.
      */}
      {rightAction ? rightAction : <View style={{ width: 44 }} />}
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

  // NOTE: content-height (not flex-1). The header used to get its height from
  // the settings icon; now that the icon lives in the footer, the title must
  // define the header's height or the whole bar collapses.
  return (
    <View className="items-center">
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
