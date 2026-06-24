import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef, useContext } from 'react';
import { LayoutChangeEvent, TouchableOpacity, View } from 'react-native';
import { BottomTabBarHeightContext } from 'react-native-bottom-tabs';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useTheme } from '../theme/ThemeContext';

interface FloatingAddButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
}

const FloatingAddButton = forwardRef<View, FloatingAddButtonProps>(
  ({ onPress, accessibilityLabel = 'Add', onLayout }, ref) => {
    const { colors } = useTheme();
    const { insets } = useResponsiveLayout();
    // With the native (floating) tab bar, content runs full-height under the
    // bar, so lift the button above it. The classic docked bar reserves its own
    // space (context is undefined → 0), so keep the original low position there.
    const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;

    return (
      <View
        ref={ref}
        onLayout={onLayout}
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          bottom:
            tabBarHeight > 0
              ? tabBarHeight + insets.bottom + 12
              : Math.max(6, insets.bottom - 14),
          right: Math.max(34, insets.right + 10),
        }}
      >
        <TouchableOpacity
          onPress={onPress}
          style={{
            backgroundColor: colors.primary.main,
            borderRadius: 32,
            width: 56,
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 5,
          }}
          activeOpacity={0.85}
          accessibilityLabel={accessibilityLabel}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }
);

export default FloatingAddButton;
