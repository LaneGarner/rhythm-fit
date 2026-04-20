import React, { useEffect, useRef } from 'react';
import { StyleSheet, Pressable, View, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  accessibilityLabel?: string;
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();

  const selectedIndex = options.findIndex(o => o.value === value);
  const slideAnim = useRef(new Animated.Value(selectedIndex)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: selectedIndex,
      useNativeDriver: false,
      friction: 10,
      tension: 60,
    }).start();
  }, [selectedIndex, slideAnim]);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.backgroundTertiary }]}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        style={[
          styles.indicator,
          {
            backgroundColor: colors.primary.main,
            width: `${100 / options.length}%` as any,
            left: slideAnim.interpolate({
              inputRange: options.map((_, i) => i),
              outputRange: options.map(
                (_, i) => `${(i * 100) / options.length}%`
              ),
            }),
          },
        ]}
      />
      {options.map(option => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={styles.segment}
            onPress={() => onValueChange(option.value)}
            hitSlop={4}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
          >
            {option.icon && (
              <Ionicons
                name={option.icon}
                size={16}
                color={isSelected ? '#FFFFFF' : colors.textSecondary}
                style={styles.icon}
              />
            )}
            <Text
              style={[
                styles.label,
                { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                isSelected && styles.labelSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    borderRadius: 8,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    minHeight: 44,
    zIndex: 1,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  labelSelected: {
    fontWeight: '600',
  },
});
