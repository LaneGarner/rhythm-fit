import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTheme } from '../../theme/ThemeContext';

interface DataPoint {
  label: string;
  value: number;
}

interface ProgressionChartProps {
  data: DataPoint[];
  title: string;
  color?: string;
  suffix?: string;
  height?: number;
}

export const ProgressionChart = ({
  data,
  title,
  color,
  suffix = '',
  height = 200,
}: ProgressionChartProps) => {
  const { colors } = useTheme();
  const chartColor = color || colors.primary.main;
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

  const chartData = data.map(d => ({
    value: d.value,
    label: d.label,
    dataPointText: `${d.value}${suffix}`,
  }));

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));

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

      <LineChart
        data={chartData}
        height={height}
        width={screenWidth - 80}
        spacing={(screenWidth - 100) / Math.max(data.length - 1, 1)}
        color={chartColor}
        thickness={2}
        startFillColor={chartColor}
        endFillColor={colors.background}
        startOpacity={0.3}
        endOpacity={0.05}
        areaChart
        curved
        hideDataPoints={data.length > 10}
        dataPointsColor={chartColor}
        dataPointsRadius={4}
        textColor={colors.textSecondary}
        textFontSize={10}
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
        pointerConfig={{
          pointerStripHeight: height,
          pointerStripColor: colors.textSecondary,
          pointerStripWidth: 1,
          pointerColor: chartColor,
          radius: 6,
          pointerLabelWidth: 80,
          pointerLabelHeight: 30,
          pointerLabelComponent: (items: any) => {
            return (
              <View
                style={{
                  backgroundColor: colors.surface,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text, fontSize: 12 }}>
                  {items[0]?.value}
                  {suffix}
                </Text>
              </View>
            );
          },
        }}
      />

      {/* Summary stats */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginTop: 16,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            High
          </Text>
          <Text style={{ color: colors.success.main, fontWeight: '600' }}>
            {maxValue}
            {suffix}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Low</Text>
          <Text style={{ color: colors.error.main, fontWeight: '600' }}>
            {minValue}
            {suffix}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            Sessions
          </Text>
          <Text style={{ color: colors.text, fontWeight: '600' }}>
            {data.length}
          </Text>
        </View>
      </View>
    </View>
  );
};
