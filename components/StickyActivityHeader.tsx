import React from 'react';
import { Animated, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import SupersetBadge from './SupersetBadge';

interface StickyActivityHeaderProps {
  emoji: string;
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
  emoji,
  title,
  subtitle,
  badge,
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
        {emoji ? (
          <Text style={{ fontSize: 16, marginRight: 6 }}>{emoji}</Text>
        ) : null}
        <Text
          numberOfLines={1}
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
            maxWidth: emoji ? '60%' : '70%',
          }}
        >
          {title}
        </Text>
        {badge ? (
          <SupersetBadge label={badge} style={{ marginLeft: 8 }} />
        ) : (
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              marginLeft: 8,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

/**
 * Large content header - renders INSIDE the ScrollView, fades out on scroll
 */
export function ContentHeader({
  emoji,
  title,
  subtitle,
  badge,
  scrollY,
}: StickyActivityHeaderProps) {
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
        paddingTop: 16,
        paddingBottom: 8,
      }}
    >
      {emoji ? (
        <Text style={{ fontSize: 40, marginBottom: 8 }}>{emoji}</Text>
      ) : null}
      <Text
        numberOfLines={2}
        style={{
          fontSize: 24,
          fontWeight: 'bold',
          textAlign: 'center',
          color: colors.text,
          paddingHorizontal: 16,
        }}
      >
        {title}
      </Text>
      {badge ? (
        <SupersetBadge label={badge} size="medium" style={{ marginTop: 8 }} />
      ) : (
        <Text
          style={{
            fontSize: 16,
            marginTop: 4,
            color: colors.textSecondary,
          }}
        >
          {subtitle}
        </Text>
      )}
    </Animated.View>
  );
}
