import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

interface PlateIconProps {
  weight?: number;
  size?: number;
  count?: number;
  variant?: 'default' | 'tooltip';
}

export default function PlateIcon({
  weight = 45,
  size,
  count,
  variant = 'default',
}: PlateIconProps) {
  const { colors } = useTheme();
  const isTooltip = variant === 'tooltip';
  const iconSize = size ?? (isTooltip ? 20 : 60);

  // Tooltip variant: blank plate
  // Default variant: weight label at bottom with center hole
  const displayLabel = weight % 1 === 0 ? weight.toString() : weight.toFixed(1);

  return (
    <View style={[styles.container, { width: iconSize, height: iconSize }]}>
      <Svg
        width={iconSize}
        height={iconSize}
        viewBox={`0 0 ${iconSize} ${iconSize}`}
      >
        {/* Outer circle (plate body) */}
        <Circle
          cx={iconSize / 2}
          cy={iconSize / 2}
          r={iconSize / 2 - 2}
          fill="#1a1a1a"
          stroke="#333"
          strokeWidth={1}
        />
        {/* Inner circle (center hole) */}
        <Circle
          cx={iconSize / 2}
          cy={iconSize / 2}
          r={iconSize / 6}
          fill="#333"
          stroke="#444"
          strokeWidth={1}
        />
        {/* Label text (not shown for tooltip variant) */}
        {!isTooltip && (
          <SvgText
            x={iconSize / 2}
            y={iconSize * 0.82}
            fill="white"
            fontSize={iconSize / 4}
            fontWeight="bold"
            textAnchor="middle"
            alignmentBaseline="central"
          >
            {displayLabel}
          </SvgText>
        )}
      </Svg>
      {count !== undefined && count > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.primary.main }]}>
          <Text style={[styles.badgeText, { color: colors.textInverse }]}>
            {count}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
