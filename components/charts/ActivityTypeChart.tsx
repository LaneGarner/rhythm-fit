import React from 'react';
import { View, Text } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useTheme } from '../../theme/ThemeContext';
import { ActivityTypeStats } from '../../services/statsService';

interface ActivityTypeChartProps {
  data: ActivityTypeStats[];
  title?: string;
}

export const ActivityTypeChart = ({
  data,
  title = 'Activity Type Breakdown',
}: ActivityTypeChartProps) => {
  const { colors } = useTheme();

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

  const totalCount = data.reduce((sum, d) => sum + d.count, 0);

  const pieData = data.slice(0, 8).map(d => ({
    value: d.count,
    color: d.color,
    text: `${d.percentage}%`,
    label: d.label,
  }));

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

      <View style={{ alignItems: 'center' }}>
        <PieChart
          data={pieData}
          donut
          radius={100}
          innerRadius={60}
          innerCircleColor={colors.surface}
          centerLabelComponent={() => (
            <View style={{ alignItems: 'center' }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 24,
                  fontWeight: 'bold',
                }}
              >
                {totalCount}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Activities
              </Text>
            </View>
          )}
          isAnimated
        />
      </View>

      {/* Legend */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginTop: 16,
          gap: 8,
        }}
      >
        {pieData.map((item, index) => (
          <View
            key={index}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginHorizontal: 4,
              marginVertical: 2,
            }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: item.color,
                marginRight: 4,
              }}
            />
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {item.label} ({item.text})
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};
