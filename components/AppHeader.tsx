import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

const APP_HEADER_HEIGHT = 52;
const TOP_TAB_BAR_CLEARANCE = 56;

interface AppHeaderProps {
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
  clearsTopTabBar?: boolean;
}

function CenteredHeaderRow({
  leftAction,
  rightAction,
  children,
}: Pick<AppHeaderProps, 'leftAction' | 'rightAction' | 'children'>) {
  const [leftSize, setLeftSize] = useState({ width: 0, height: 0 });
  const [rightSize, setRightSize] = useState({ width: 0, height: 0 });
  const sideWidth = Math.max(
    leftAction ? leftSize.width : 0,
    rightAction ? rightSize.width : 0
  );
  const rowHeight = Math.max(
    APP_HEADER_HEIGHT,
    leftAction ? leftSize.height : 0,
    rightAction ? rightSize.height : 0
  );

  return (
    <View style={{ minHeight: rowHeight, justifyContent: 'center' }}>
      {leftAction && (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <View onLayout={event => setLeftSize(event.nativeEvent.layout)}>
            {leftAction}
          </View>
        </View>
      )}
      <View style={{ paddingHorizontal: sideWidth, alignItems: 'center' }}>
        {children}
      </View>
      {rightAction && (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <View onLayout={event => setRightSize(event.nativeEvent.layout)}>
            {rightAction}
          </View>
        </View>
      )}
    </View>
  );
}

export default function AppHeader({
  leftAction,
  rightAction,
  children,
  clearsTopTabBar = false,
}: AppHeaderProps) {
  const { colors } = useTheme();
  const { insets, hasTopTabBar } = useResponsiveLayout();
  const topTabBarClearance = clearsTopTabBar && hasTopTabBar;

  return (
    <View
      className="border-b"
      style={{
        // iPadOS promotes the native Liquid Glass tab bar to the top of the
        // screen. Keep the content title in its own layer below that floating
        // navigation instead of letting the two headers compete.
        paddingTop: insets.top + (topTabBarClearance ? TOP_TAB_BAR_CLEARANCE : 0),
        paddingHorizontal: Math.max(16, insets.left, insets.right),
        backgroundColor: colors.surface,
        borderBottomColor: colors.border,
      }}
    >
      <CenteredHeaderRow leftAction={leftAction} rightAction={rightAction}>
        {children}
      </CenteredHeaderRow>
    </View>
  );
}

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
      <Text
        accessibilityRole="header"
        className="font-bold text-center"
        style={{ color: colors.text, fontSize: 20, lineHeight: 24 }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          className="text-center"
          style={{
            color: colors.textSecondary,
            fontSize: 14,
            lineHeight: 16,
            marginTop: 2,
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
};
