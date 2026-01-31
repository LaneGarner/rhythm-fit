import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { ProgressionChart } from '../components/charts/ProgressionChart';
import { RootState } from '../redux/store';
import {
  calculateExerciseStats,
  formatTime,
  formatWeight,
  formatDistance,
  getExerciseProgressionData,
  BODY_PART_LABELS,
  BODY_PART_COLORS,
} from '../services/statsService';
import { useTheme } from '../theme/ThemeContext';

type MetricType = 'weight' | 'reps' | 'volume' | 'time' | 'distance';

export default function ExerciseStatsScreen({ navigation, route }: any) {
  const { exerciseName } = route.params;
  const activities = useSelector((state: RootState) => state.activities.data);
  const { colors, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const [selectedMetric, setSelectedMetric] = useState<MetricType>('weight');

  const stats = useMemo(
    () => calculateExerciseStats(activities, exerciseName),
    [activities, exerciseName]
  );

  const chartData = useMemo(() => {
    if (!stats) return [];
    return getExerciseProgressionData(stats, selectedMetric);
  }, [stats, selectedMetric]);

  const getMetricSuffix = (metric: MetricType): string => {
    switch (metric) {
      case 'weight':
        return ' lbs';
      case 'reps':
        return '';
      case 'volume':
        return ' lbs';
      case 'time':
        return 's';
      case 'distance':
        return ' mi';
      default:
        return '';
    }
  };

  const availableMetrics: MetricType[] = useMemo(() => {
    if (!stats) return [];
    const metrics: MetricType[] = [];
    if (stats.maxWeight > 0) metrics.push('weight');
    if (stats.maxReps > 0) metrics.push('reps');
    if (stats.totalWeight > 0) metrics.push('volume');
    if (stats.totalTime > 0) metrics.push('time');
    if (stats.totalDistance > 0) metrics.push('distance');
    return metrics;
  }, [stats]);

  if (!stats) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingTop: 72,
            paddingBottom: 16,
            paddingHorizontal: 16,
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <TouchableOpacity
            hitSlop={14}
            onPress={() => navigation.goBack()}
            style={{ paddingVertical: 4, paddingHorizontal: 8, marginRight: 8 }}
          >
            <Text
              style={{
                color: colors.primary.main,
                fontSize: 18,
                fontWeight: '500',
              }}
            >
              Back
            </Text>
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center p-4">
          <Ionicons
            name="stats-chart-outline"
            size={48}
            color={colors.textSecondary}
          />
          <Text style={{ color: colors.text, fontSize: 18, marginTop: 16 }}>
            No data found for this exercise
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 72,
          paddingBottom: 16,
          paddingHorizontal: 16,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity
          hitSlop={14}
          onPress={() => navigation.goBack()}
          style={{ paddingVertical: 4, paddingHorizontal: 8, marginRight: 8 }}
        >
          <Text
            style={{
              color: colors.primary.main,
              fontSize: 18,
              fontWeight: '500',
            }}
          >
            Back
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={{ color: colors.text, fontSize: 20, fontWeight: 'bold' }}
            numberOfLines={1}
          >
            {exerciseName}
          </Text>
        </View>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        {/* Muscle Groups */}
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
              marginBottom: 12,
            }}
          >
            Muscles Worked
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <View
              style={{
                backgroundColor: BODY_PART_COLORS[stats.primaryMuscle],
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>
                {BODY_PART_LABELS[stats.primaryMuscle]}
              </Text>
            </View>
            {stats.secondaryMuscles.map(muscle => (
              <View
                key={muscle}
                style={{
                  backgroundColor: colors.backgroundSecondary,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: BODY_PART_COLORS[muscle],
                }}
              >
                <Text style={{ color: BODY_PART_COLORS[muscle] }}>
                  {BODY_PART_LABELS[muscle]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Summary Stats */}
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
              marginBottom: 12,
            }}
          >
            All-Time Stats
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            <View style={{ minWidth: 80 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Sessions
              </Text>
              <Text
                style={{ color: colors.text, fontSize: 20, fontWeight: 'bold' }}
              >
                {stats.sessions}
              </Text>
            </View>
            <View style={{ minWidth: 80 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Total Sets
              </Text>
              <Text
                style={{ color: colors.text, fontSize: 20, fontWeight: 'bold' }}
              >
                {stats.totalSets}
              </Text>
            </View>
            {stats.maxWeight > 0 && (
              <View style={{ minWidth: 80 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Max Weight
                </Text>
                <Text
                  style={{
                    color: colors.success.main,
                    fontSize: 20,
                    fontWeight: 'bold',
                  }}
                >
                  {formatWeight(stats.maxWeight)}
                </Text>
              </View>
            )}
            {stats.maxReps > 0 && (
              <View style={{ minWidth: 80 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Max Reps
                </Text>
                <Text
                  style={{
                    color: colors.success.main,
                    fontSize: 20,
                    fontWeight: 'bold',
                  }}
                >
                  {stats.maxReps}
                </Text>
              </View>
            )}
            {stats.totalTime > 0 && (
              <View style={{ minWidth: 80 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Total Time
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 20,
                    fontWeight: 'bold',
                  }}
                >
                  {formatTime(stats.totalTime)}
                </Text>
              </View>
            )}
            {stats.totalDistance > 0 && (
              <View style={{ minWidth: 80 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Total Distance
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 20,
                    fontWeight: 'bold',
                  }}
                >
                  {formatDistance(stats.totalDistance)}
                </Text>
              </View>
            )}
            {stats.totalWeight > 0 && (
              <View style={{ minWidth: 120 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Total Volume
                </Text>
                <Text
                  style={{
                    color: colors.primary.main,
                    fontSize: 20,
                    fontWeight: 'bold',
                  }}
                >
                  {stats.totalWeight.toLocaleString()} lbs
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Metric Selector */}
        {availableMetrics.length > 1 && (
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 4,
              marginBottom: 16,
            }}
          >
            {availableMetrics.map(metric => (
              <TouchableOpacity
                key={metric}
                onPress={() => setSelectedMetric(metric)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor:
                    selectedMetric === metric
                      ? colors.primary.main
                      : 'transparent',
                }}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    color:
                      selectedMetric === metric ? '#fff' : colors.textSecondary,
                    fontWeight: selectedMetric === metric ? '600' : '400',
                    textTransform: 'capitalize',
                  }}
                >
                  {metric}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Progression Chart */}
        <ProgressionChart
          data={chartData}
          title={`${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Progression`}
          color={colors.primary.main}
          suffix={getMetricSuffix(selectedMetric)}
        />

        {/* Recent History */}
        <View
          style={{
            backgroundColor: colors.surface,
            padding: 16,
            borderRadius: 12,
            marginBottom: 32,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 16,
              fontWeight: '600',
              marginBottom: 12,
            }}
          >
            Recent Sessions
          </Text>
          {stats.history
            .slice(-5)
            .reverse()
            .map((session, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: index < 4 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text }}>
                  {dayjs(session.date).format('MMM D, YYYY')}
                </Text>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  {session.maxWeight > 0 && (
                    <Text style={{ color: colors.textSecondary }}>
                      {session.maxWeight} lbs
                    </Text>
                  )}
                  {session.maxReps > 0 && (
                    <Text style={{ color: colors.textSecondary }}>
                      {session.maxReps} reps
                    </Text>
                  )}
                  {session.totalTime > 0 && (
                    <Text style={{ color: colors.textSecondary }}>
                      {formatTime(session.totalTime)}
                    </Text>
                  )}
                </View>
              </View>
            ))}
        </View>
      </ScrollView>
    </View>
  );
}
