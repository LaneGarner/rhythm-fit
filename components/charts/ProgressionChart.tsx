import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LineChart } from 'react-native-gifted-charts';
import dayjs from 'dayjs';
import { useTheme } from '../../theme/ThemeContext';

interface DataPoint {
  label: string;
  value: number;
  date?: string;
}

interface ProgressionChartProps {
  data: DataPoint[];
  title: string;
  color?: string;
  suffix?: string;
  height?: number;
}

interface PointerState {
  index: number;
  x: number;
  y: number;
  dateLabel: string;
  value: number;
}

const INITIAL_SPACING = 25;
const Y_AXIS_LABEL_WIDTH = 35;
const TOOLTIP_WIDTH = 90;

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
  const [pointer, setPointer] = useState<PointerState | null>(null);
  const scrollOffsetRef = useRef(0);

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

  const chartWidth = screenWidth - 120;
  const minSpacing = 50;
  const naturalSpacing = chartWidth / Math.max(data.length - 1, 1);
  const spacing = Math.max(minSpacing, Math.min(naturalSpacing, 80));

  const maxLabels = 5;
  const labelInterval =
    data.length <= maxLabels ? 1 : Math.ceil(data.length / maxLabels);

  const chartData = data.map((d, i) => {
    const isYearBoundary =
      i > 0 &&
      d.date &&
      data[i - 1]?.date &&
      dayjs(d.date).year() !== dayjs(data[i - 1].date).year();
    const showLabel =
      i === 0 ||
      i === data.length - 1 ||
      i % labelInterval === 0 ||
      isYearBoundary;
    return {
      value: d.value,
      label: showLabel ? d.label : '',
      date: d.date,
    };
  });

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const adjustedMax = maxValue * 1.1;

  const updatePointer = useCallback(
    (gestureX: number) => {
      const adjustedX =
        gestureX - Y_AXIS_LABEL_WIDTH + scrollOffsetRef.current;
      const index = Math.round(
        (adjustedX - INITIAL_SPACING) / spacing
      );
      const clamped = Math.max(0, Math.min(index, chartData.length - 1));
      const item = chartData[clamped];
      const x =
        Y_AXIS_LABEL_WIDTH +
        INITIAL_SPACING +
        clamped * spacing -
        scrollOffsetRef.current;
      const y = height * (1 - item.value / adjustedMax);
      const dateLabel = item.date
        ? dayjs(item.date).format('M/D/YY')
        : item.label || '';
      setPointer({ index: clamped, x, y, dateLabel, value: item.value });
    },
    [chartData, spacing, height, adjustedMax]
  );

  const clearPointer = useCallback(() => {
    setPointer(null);
  }, []);

  const pointerGesture = Gesture.Pan()
    .activateAfterLongPress(300)
    .runOnJS(true)
    .onStart(e => {
      updatePointer(e.x);
    })
    .onUpdate(e => {
      updatePointer(e.x);
    })
    .onEnd(() => {
      clearPointer();
    });

  // Tooltip x position, clamped to stay within the card
  const cardWidth = screenWidth - 32; // screen minus outer margins
  const tooltipLeft = pointer
    ? Math.max(
        4,
        Math.min(pointer.x - TOOLTIP_WIDTH / 2, cardWidth - TOOLTIP_WIDTH - 4)
      )
    : 0;

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

      {/* Tooltip rendered outside overflow:hidden */}
      {pointer && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 16 + 32 + pointer.y - 44,
            left: 16 + tooltipLeft,
            width: TOOLTIP_WIDTH,
            zIndex: 10,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
              {pointer.dateLabel}
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 13,
                fontWeight: '600',
              }}
            >
              {pointer.value}
              {suffix}
            </Text>
          </View>
        </View>
      )}

      <GestureDetector gesture={pointerGesture}>
        <View style={{ overflow: 'hidden' }}>
          <LineChart
            data={chartData}
            height={height}
            width={chartWidth}
            spacing={spacing}
            initialSpacing={INITIAL_SPACING}
            endSpacing={10}
            scrollToEnd
            onScroll={ev => {
              scrollOffsetRef.current = ev.nativeEvent.contentOffset.x;
            }}
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
            xAxisColor={colors.border}
            yAxisColor={colors.border}
            yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
            hideRules={false}
            rulesColor={colors.border}
            rulesType="dashed"
            maxValue={adjustedMax}
            noOfSections={4}
            yAxisLabelSuffix={suffix}
            isAnimated
            animationDuration={500}
          />

          {/* Custom pointer overlay */}
          {pointer && (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {/* Vertical line */}
              <View
                style={{
                  position: 'absolute',
                  left: pointer.x,
                  top: 0,
                  width: 1,
                  height,
                  backgroundColor: colors.textSecondary,
                }}
              />
              {/* Dot at data point */}
              <View
                style={{
                  position: 'absolute',
                  left: pointer.x - 5,
                  top: pointer.y - 5,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: chartColor,
                }}
              />
            </View>
          )}
        </View>
      </GestureDetector>

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
