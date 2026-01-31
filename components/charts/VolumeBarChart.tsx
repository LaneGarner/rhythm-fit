import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useTheme } from '../../theme/ThemeContext';

interface BarDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface VolumeBarChartProps {
  data: BarDataPoint[];
  title: string;
  suffix?: string;
  height?: number;
}

export const VolumeBarChart = ({
  data,
  title,
  suffix = '',
  height = 200,
}: VolumeBarChartProps) => {
  const { colors } = useTheme();
  const screenWidth = Dimensions.get('window').width;

  if (data.length === 0) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          padding: 16,
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
          {title}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            marginTop: 16,
            textAlign: 'center',
          }}
        >
          No data available
        </Text>
      </View>
    );
  }

  const barData = data.map(d => ({
    value: d.value,
    label: d.label,
    frontColor: d.color || colors.primary.main,
    topLabelComponent: () => (
      <Text
        style={{ color: colors.textSecondary, fontSize: 10, marginBottom: 4 }}
      >
        {d.value > 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value}
      </Text>
    ),
  }));

  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = Math.min(32, (screenWidth - 100) / data.length - 8);

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: 16,
          fontWeight: '600',
          marginBottom: 16,
        }}
      >
        {title}
      </Text>

      <BarChart
        data={barData}
        height={height}
        width={screenWidth - 80}
        barWidth={barWidth}
        spacing={8}
        xAxisColor={colors.border}
        yAxisColor={colors.border}
        yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
        hideRules={false}
        rulesColor={colors.border}
        rulesType="dashed"
        maxValue={maxValue * 1.1}
        noOfSections={4}
        yAxisLabelSuffix={suffix}
        isAnimated
        animationDuration={500}
        barBorderRadius={4}
      />
    </View>
  );
};
