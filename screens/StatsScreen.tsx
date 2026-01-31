import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import React, { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loadActivitiesFromStorage } from '../redux/activitySlice';
import { AppDispatch } from '../redux/store';
import AppHeader, { AppHeaderTitle } from '../components/AppHeader';
import { ActivityTypeChart } from '../components/charts/ActivityTypeChart';
import { MuscleGroupChart } from '../components/charts/MuscleGroupChart';
import { VolumeBarChart } from '../components/charts/VolumeBarChart';
import { RootState } from '../redux/store';
import {
  calculateMuscleGroupStats,
  calculateOverallStats,
  calculatePersonalRecords,
  calculateConsistencyStats,
  calculateActivityTypeBreakdown,
  getUniqueExercises,
  calculateExerciseStats,
  formatTime,
} from '../services/statsService';
import { useTheme } from '../theme/ThemeContext';

type TimeRange = 7 | 30 | 90 | 365;

export default function StatsScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const activities = useSelector((state: RootState) => state.activities.data);
  const { colorScheme, colors } = useTheme();
  const isDark = colorScheme === 'dark';

  const [timeRange, setTimeRange] = useState<TimeRange>(30);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllExercises, setShowAllExercises] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(loadActivitiesFromStorage());
    setRefreshing(false);
  }, [dispatch]);

  // Filter activities by time range (only completed activities for stats)
  const filteredActivities = useMemo(() => {
    const startDate = dayjs().subtract(timeRange, 'day');
    const today = dayjs().endOf('day');
    return activities.filter(activity => {
      const activityDate = dayjs(activity.date);
      return (
        activity.completed &&
        activityDate.isAfter(startDate) &&
        (activityDate.isBefore(today) || activityDate.isSame(today, 'day'))
      );
    });
  }, [activities, timeRange]);

  // Calculate stats
  const overallStats = useMemo(
    () => calculateOverallStats(activities, timeRange),
    [activities, timeRange]
  );

  const muscleStats = useMemo(
    () => calculateMuscleGroupStats(filteredActivities),
    [filteredActivities]
  );

  const uniqueExercises = useMemo(
    () => getUniqueExercises(filteredActivities),
    [filteredActivities]
  );

  // Get top exercises by sessions
  const topExercises = useMemo(() => {
    return uniqueExercises
      .map(name => {
        const stats = calculateExerciseStats(filteredActivities, name);
        return { name, sessions: stats?.sessions || 0, stats };
      })
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5);
  }, [uniqueExercises, filteredActivities]);

  // Personal records
  const personalRecords = useMemo(
    () => calculatePersonalRecords(activities, timeRange),
    [activities, timeRange]
  );

  // Consistency stats
  const consistencyStats = useMemo(
    () => calculateConsistencyStats(activities, timeRange),
    [activities, timeRange]
  );

  // Activity type breakdown
  const activityTypeBreakdown = useMemo(
    () => calculateActivityTypeBreakdown(filteredActivities),
    [filteredActivities]
  );

  // Volume data (daily for 7D, weekly for longer ranges)
  const volumeData = useMemo(() => {
    const data: { label: string; value: number }[] = [];

    if (timeRange === 7) {
      // Daily data for 7D view
      for (let i = 6; i >= 0; i--) {
        const date = dayjs().subtract(i, 'day');
        const label = date.format('M/D');

        let volume = 0;
        for (const activity of activities) {
          const activityDate = dayjs(activity.date);
          if (
            activityDate.isSame(date, 'day') &&
            activity.completed &&
            activity.sets
          ) {
            for (const set of activity.sets) {
              if (set.completed && set.weight && set.reps) {
                volume += set.weight * set.reps;
              }
            }
          }
        }
        data.push({ label, value: volume });
      }
    } else {
      // Weekly data for longer ranges
      const weeksToShow = Math.min(Math.floor(timeRange / 7), 12);

      for (let i = weeksToShow - 1; i >= 0; i--) {
        const weekStart = dayjs().subtract(i * 7 + 6, 'day');
        const weekEnd = dayjs().subtract(i * 7, 'day');
        const label = weekStart.format('M/D');

        let volume = 0;
        for (const activity of activities) {
          const activityDate = dayjs(activity.date);
          if (
            activityDate.isAfter(weekStart.subtract(1, 'day')) &&
            activityDate.isBefore(weekEnd.add(1, 'day')) &&
            activity.completed &&
            activity.sets
          ) {
            for (const set of activity.sets) {
              if (set.completed && set.weight && set.reps) {
                volume += set.weight * set.reps;
              }
            }
          }
        }
        data.push({ label, value: volume });
      }
    }

    return data;
  }, [activities, timeRange]);

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: 7, label: '7D' },
    { value: 30, label: '30D' },
    { value: 90, label: '90D' },
    { value: 365, label: '1Y' },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <AppHeader>
        <AppHeaderTitle
          title="Your Stats"
          subtitle={`Last ${timeRange} Days`}
        />
      </AppHeader>

      <ScrollView
        className="flex-1"
        stickyHeaderIndices={[personalRecords.recentPRs.length > 0 ? 1 : 0]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? '#fff' : colors.textSecondary}
          />
        }
      >
        {/* Recent PRs - Scrolls with page */}
        {personalRecords.recentPRs.length > 0 && (
          <View
            style={{
              backgroundColor: colors.surface,
              marginHorizontal: 16,
              marginTop: 16,
              padding: 16,
              borderRadius: 12,
              borderLeftWidth: 3,
              borderLeftColor: colors.warning.main,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="trophy" size={20} color={colors.warning.main} />
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: '600',
                    marginLeft: 8,
                  }}
                >
                  Recent PRs
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('PersonalRecords')}
                hitSlop={14}
                style={{ flexDirection: 'row', alignItems: 'center' }}
                accessibilityRole="button"
                accessibilityLabel="View all personal records"
              >
                <Text
                  style={{
                    color: colors.primary.main,
                    fontSize: 14,
                    fontWeight: '500',
                    marginRight: 4,
                  }}
                >
                  View All
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.primary.main}
                />
              </TouchableOpacity>
            </View>
            {personalRecords.recentPRs.slice(0, 3).map((pr, index) => (
              <TouchableOpacity
                key={pr.exerciseName}
                onPress={() =>
                  navigation.navigate('ExerciseStats', {
                    exerciseName: pr.exerciseName,
                  })
                }
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 8,
                  borderTopWidth: index > 0 ? 1 : 0,
                  borderTopColor: colors.border,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    flex: 1,
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '500' }}>
                    {pr.exerciseName}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text
                    style={{
                      color: colors.warning.main,
                      fontWeight: '600',
                      marginRight: 8,
                    }}
                  >
                    {pr.isNewWeightPR && `${pr.maxWeight} lbs`}
                    {pr.isNewWeightPR && pr.isNewRepsPR && ' / '}
                    {pr.isNewRepsPR && `${pr.maxReps} reps`}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Time Range Selector - Sticky header */}
        <View
          style={{
            backgroundColor: colors.background,
            paddingTop: 16,
            paddingBottom: 8,
            paddingHorizontal: 16,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 4,
            }}
          >
            {timeRangeOptions.map(option => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setTimeRange(option.value)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor:
                    timeRange === option.value
                      ? colors.primary.main
                      : 'transparent',
                }}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    color:
                      timeRange === option.value
                        ? '#fff'
                        : colors.textSecondary,
                    fontWeight: timeRange === option.value ? '600' : '400',
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats Content */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          {/* Summary Cards */}
          <View className="flex-row justify-between mb-4">
            <View
              style={{ backgroundColor: colors.surface }}
              className="flex-1 p-4 rounded-xl mr-2 shadow-sm"
            >
              <Text
                className="text-2xl font-bold"
                style={{ color: colors.primary.main }}
              >
                {overallStats.totalActivities}
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-sm">
                Activities
              </Text>
            </View>
            <View
              style={{ backgroundColor: colors.surface }}
              className="flex-1 p-4 rounded-xl ml-2 shadow-sm"
            >
              <Text
                className="text-2xl font-bold"
                style={{ color: colors.success.main }}
              >
                {overallStats.completionRate}%
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-sm">
                Completion
              </Text>
            </View>
          </View>

          <View className="flex-row justify-between mb-4">
            <View
              style={{ backgroundColor: colors.surface }}
              className="flex-1 p-4 rounded-xl mr-2 shadow-sm"
            >
              <Text
                className="text-2xl font-bold"
                style={{ color: colors.warning.main }}
              >
                {overallStats.currentStreak}
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-sm">
                Current Streak
              </Text>
            </View>
            <View
              style={{ backgroundColor: colors.surface }}
              className="flex-1 p-4 rounded-xl ml-2 shadow-sm"
            >
              <Text
                className="text-2xl font-bold"
                style={{ color: colors.secondary.main }}
              >
                {overallStats.averagePerWeek}/wk
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-sm">
                Avg Activities
              </Text>
            </View>
          </View>

          {/* Volume & Reps Stats */}
          <View
            style={{ backgroundColor: colors.surface }}
            className="p-4 rounded-xl mb-4 shadow-sm"
          >
            <Text
              className="text-lg font-semibold mb-3"
              style={{ color: colors.text }}
            >
              Training Summary
            </Text>
            <View className="flex-row flex-wrap">
              <View style={{ width: '50%', marginBottom: 12 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Total Sets
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 18,
                    fontWeight: '600',
                  }}
                >
                  {overallStats.totalSets}
                </Text>
              </View>
              <View style={{ width: '50%', marginBottom: 12 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Total Reps
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 18,
                    fontWeight: '600',
                  }}
                >
                  {overallStats.totalReps.toLocaleString()}
                </Text>
              </View>
              <View style={{ width: '50%' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Total Volume
                </Text>
                <Text
                  style={{
                    color: colors.primary.main,
                    fontSize: 18,
                    fontWeight: '600',
                  }}
                >
                  {overallStats.totalVolume.toLocaleString()} lbs
                </Text>
              </View>
              {overallStats.totalTime > 0 && (
                <View style={{ width: '50%' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    Total Time
                  </Text>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 18,
                      fontWeight: '600',
                    }}
                  >
                    {formatTime(overallStats.totalTime)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Consistency Stats */}
          <View
            style={{ backgroundColor: colors.surface }}
            className="p-4 rounded-xl mb-4 shadow-sm"
          >
            <Text
              className="text-lg font-semibold mb-3"
              style={{ color: colors.text }}
            >
              Consistency
            </Text>
            <View className="flex-row flex-wrap">
              <View style={{ width: '50%', marginBottom: 12 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Days/Week
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 18,
                    fontWeight: '600',
                  }}
                >
                  {consistencyStats.daysPerWeek}
                </Text>
              </View>
              <View style={{ width: '50%', marginBottom: 12 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Longest Gap
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 18,
                    fontWeight: '600',
                  }}
                >
                  {consistencyStats.longestGapDays} days
                </Text>
              </View>
              {consistencyStats.bestWeek.sessions > 0 && (
                <>
                  <View style={{ width: '50%' }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      Best Week
                    </Text>
                    <Text
                      style={{
                        color: colors.success.main,
                        fontSize: 18,
                        fontWeight: '600',
                      }}
                    >
                      {consistencyStats.bestWeek.sessions} sessions
                    </Text>
                  </View>
                  <View style={{ width: '50%' }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      Week Of
                    </Text>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 14,
                        fontWeight: '500',
                      }}
                    >
                      {dayjs(consistencyStats.bestWeek.weekStart).format(
                        'MMM D, YYYY'
                      )}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Volume Chart */}
          {volumeData.some(d => d.value > 0) && (
            <VolumeBarChart
              data={volumeData}
              title={timeRange === 7 ? 'Daily Volume' : 'Weekly Volume'}
              suffix=" lbs"
            />
          )}

          {/* Activity Type Breakdown */}
          {activityTypeBreakdown.length > 0 && (
            <ActivityTypeChart
              data={activityTypeBreakdown}
              title="Activity Type Breakdown"
            />
          )}

          {/* Muscle Group Distribution */}
          {muscleStats.length > 0 && (
            <MuscleGroupChart
              data={muscleStats}
              title="Muscle Group Distribution"
            />
          )}

          {/* Top Exercises */}
          <View
            style={{ backgroundColor: colors.surface }}
            className="p-4 rounded-xl mb-4 shadow-sm"
          >
            <Text
              className="text-lg font-semibold mb-3"
              style={{ color: colors.text }}
            >
              Top Exercises
            </Text>
            {topExercises.length > 0 ? (
              topExercises.map((exercise, index) => (
                <TouchableOpacity
                  key={exercise.name}
                  onPress={() =>
                    navigation.navigate('ExerciseStats', {
                      exerciseName: exercise.name,
                    })
                  }
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: index < topExercises.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      flex: 1,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.primary.main,
                        fontSize: 16,
                        fontWeight: '600',
                        marginRight: 12,
                        width: 24,
                      }}
                    >
                      #{index + 1}
                    </Text>
                    <Text
                      style={{ color: colors.text, flex: 1 }}
                      numberOfLines={1}
                    >
                      {exercise.name}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text
                      style={{ color: colors.textSecondary, marginRight: 8 }}
                    >
                      {exercise.sessions} sessions
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text
                style={{ color: colors.textSecondary }}
                className="text-center py-4"
              >
                No exercises recorded yet
              </Text>
            )}
          </View>

          {/* All Exercises List */}
          {uniqueExercises.length > 5 && (
            <View
              style={{ backgroundColor: colors.surface }}
              className="p-4 rounded-xl mb-6 shadow-sm"
            >
              <Text
                className="text-lg font-semibold mb-3"
                style={{ color: colors.text }}
              >
                All Exercises ({uniqueExercises.length})
              </Text>
              {(showAllExercises
                ? uniqueExercises
                : uniqueExercises.slice(0, 5)
              ).map((exercise, index, arr) => (
                <TouchableOpacity
                  key={exercise}
                  onPress={() =>
                    navigation.navigate('ExerciseStats', {
                      exerciseName: exercise,
                    })
                  }
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 10,
                    borderBottomWidth: index < arr.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.text }} numberOfLines={1}>
                    {exercise}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}

              {/* Show More / Show Less Button */}
              <TouchableOpacity
                onPress={() => setShowAllExercises(!showAllExercises)}
                hitSlop={14}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                  marginTop: 8,
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  showAllExercises
                    ? 'Show fewer exercises'
                    : `Show ${uniqueExercises.length - 5} more exercises`
                }
              >
                <Ionicons
                  name={showAllExercises ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.primary.main}
                  style={{ marginRight: 6 }}
                />
                <Text style={{ color: colors.primary.main, fontWeight: '500' }}>
                  {showAllExercises
                    ? 'Show Less'
                    : `Show ${uniqueExercises.length - 5} More`}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Spacer for bottom nav */}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
}
