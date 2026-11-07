import React from 'react';
import { Animated, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Activity } from '../types/activity';

interface StickyActivityHeaderProps {
  activityType?: string | null;
  activities?: Activity[];
  title: string;
  subtitle: string;
  badge?: string;
  scrollY: Animated.Value;
}

const COLLAPSE_THRESHOLD = 80;

/**
 * Sticky compact header - renders OUTSIDE the ScrollView, fixed below nav header
 */
export function StickyCompactHeader({
  title,
  scrollY,
}: StickyActivityHeaderProps) {
  const { colors } = useTheme();

  const stickyOpacity = scrollY.interpolate({
    inputRange: [COLLAPSE_THRESHOLD - 20, COLLAPSE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        opacity: stickyOpacity,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingVertical: 10,
        paddingHorizontal: 16,
      }}
      pointerEvents="none"
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
            flexShrink: 1,
          }}
        >
          {title}
        </Text>
      </View>
    </Animated.View>
  );
}

/**
 * Large content header - renders INSIDE the ScrollView, fades out on scroll
 */
export function ContentHeader({ title, scrollY }: StickyActivityHeaderProps) {
  const { colors } = useTheme();

  const contentOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_THRESHOLD],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={{
        alignItems: 'center',
        opacity: contentOpacity,
        paddingTop: 12,
        paddingBottom: 4,
        paddingHorizontal: 16,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{
          fontSize: 30,
          fontWeight: 'bold',
          textAlign: 'center',
          color: colors.text,
          width: '100%',
        }}
      >
        {title}
      </Text>
    </Animated.View>
  );
}
