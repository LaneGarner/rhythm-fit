import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

interface PlateIconProps {
  weight: number;
  size?: number;
  count?: number;
}

export default function PlateIcon({
  weight,
  size = 60,
  count,
}: PlateIconProps) {
  // Format weight for display (remove trailing zeros)
  const weightLabel = weight % 1 === 0 ? weight.toString() : weight.toFixed(1);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer circle (plate body) */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 2}
          fill="#1a1a1a"
          stroke="#333"
          strokeWidth={1}
        />
        {/* Inner circle (center hole) */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 6}
          fill="#333"
          stroke="#444"
          strokeWidth={1}
        />
        {/* Weight text */}
        <SvgText
          x={size / 2}
          y={size * 0.86}
          fill="white"
          fontSize={size / 5}
          fontWeight="bold"
          textAnchor="middle"
        >
          {weightLabel}
        </SvgText>
      </Svg>
      {count !== undefined && count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
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
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
