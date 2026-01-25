import dayjs from 'dayjs';
import React, { useContext } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import AppHeader, { AppHeaderTitle } from '../components/AppHeader';
import { RootState } from '../redux/store';
import { ThemeContext } from '../theme/ThemeContext';

export default function StatsScreen({ navigation }: any) {
  const activities = useSelector((state: RootState) => state.activities.data);
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  // Calculate stats for the last 30 days (today and earlier only)
  const thirtyDaysAgo = dayjs().subtract(30, 'days');
  const today = dayjs().endOf('day');
  const recentActivities = activities.filter(activity => {
    const activityDate = dayjs(activity.date);
    return (
      (activityDate.isAfter(thirtyDaysAgo) && activityDate.isBefore(today)) ||
      activityDate.isSame(today, 'day')
    );
  });

  const completedActivities = recentActivities.filter(a => a.completed);
  const completionRate =
    recentActivities.length > 0
      ? Math.round((completedActivities.length / recentActivities.length) * 100)
      : 0;

  // Activity type breakdown
  const typeCounts = recentActivities.reduce(
    (acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const mostCommonType =
    Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'None';

  // Exercise breakdown - analyze exercises from activity sets
  const exerciseCounts: Record<string, number> = {};

  recentActivities.forEach(activity => {
    if (activity.sets) {
      activity.sets.forEach(set => {
        if (set.notes && set.notes.trim()) {
          const exerciseName = set.notes.trim();
          exerciseCounts[exerciseName] =
            (exerciseCounts[exerciseName] || 0) + 1;
        }
      });
    }
  });

  // Get top 3 most common exercises
  const topExercises = Object.entries(exerciseCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: isDark ? '#000' : '#F9FAFB' }}
    >
      <AppHeader>
        <AppHeaderTitle title="Your Stats" subtitle="Last 30 Days" />
      </AppHeader>

      <ScrollView className="flex-1 px-4 pt-4">
        {/* Development Notice */}
        <View
          style={{
            backgroundColor: isDark ? '#1e3a5f' : '#dbeafe',
            borderColor: isDark ? '#3b82f6' : '#93c5fd',
            borderWidth: 1,
          }}
          className="p-3 rounded-lg mb-4"
        >
          <Text
            style={{ color: isDark ? '#93c5fd' : '#1e40af' }}
            className="text-sm text-center"
          >
            Stats page is still under development
          </Text>
        </View>

        {/* Summary Cards */}
        <View className="flex-row justify-between mb-6">
          <View
            style={{ backgroundColor: isDark ? '#18181b' : '#fff' }}
            className="flex-1 p-4 rounded-xl mr-2 shadow-sm"
          >
            <Text
              className="text-2xl font-bold"
              style={{ color: isDark ? '#60a5fa' : '#2563eb' }}
            >
              {recentActivities.length}
            </Text>
            <Text
              style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
              className="text-sm"
            >
              Total Activities
            </Text>
          </View>
          <View
            style={{ backgroundColor: isDark ? '#18181b' : '#fff' }}
            className="flex-1 p-4 rounded-xl ml-2 shadow-sm"
          >
            <Text
              className="text-2xl font-bold"
              style={{ color: isDark ? '#34d399' : '#22c55e' }}
            >
              {completionRate}%
            </Text>
            <Text
              style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
              className="text-sm"
            >
              Completion Rate
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between mb-6">
          <View
            style={{ backgroundColor: isDark ? '#18181b' : '#fff' }}
            className="flex-1 p-4 rounded-xl mr-2 shadow-sm"
          >
            <Text
              className="text-2xl font-bold"
              style={{ color: isDark ? '#a78bfa' : '#7c3aed' }}
            >
              {completedActivities.length}
            </Text>
            <Text
              style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
              className="text-sm"
            >
              Completed
            </Text>
          </View>
          <View
            style={{ backgroundColor: isDark ? '#18181b' : '#fff' }}
            className="flex-1 p-4 rounded-xl ml-2 shadow-sm"
          >
            <Text
              className="text-2xl font-bold"
              style={{ color: isDark ? '#fdba74' : '#f59e42' }}
            >
              {Math.round((recentActivities.length / 30) * 7)}/week
            </Text>
            <Text
              style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
              className="text-sm"
            >
              Avg. Per Week
            </Text>
          </View>
        </View>

        {/* Top 3 Most Common Exercises */}
        <View
          style={{ backgroundColor: isDark ? '#18181b' : '#fff' }}
          className="p-4 rounded-xl mb-6 shadow-sm"
        >
          <Text
            className="text-lg font-semibold mb-3"
            style={{ color: isDark ? '#fff' : '#111' }}
          >
            Top 3 Most Common Exercises
          </Text>
          {topExercises.length > 0 ? (
            topExercises.map(([exercise, count], index) => (
              <View
                key={exercise}
                className="flex-row justify-between items-center py-2"
              >
                <View className="flex-row items-center flex-1">
                  <Text
                    className="text-lg mr-3"
                    style={{ color: isDark ? '#60a5fa' : '#2563eb' }}
                  >
                    #{index + 1}
                  </Text>
                  <Text
                    style={{ color: isDark ? '#e5e5e5' : '#374151' }}
                    className="capitalize flex-1"
                    numberOfLines={2}
                  >
                    {exercise}
                  </Text>
                </View>
                <Text
                  className="font-semibold ml-2"
                  style={{ color: isDark ? '#fff' : '#111' }}
                >
                  {count}
                </Text>
              </View>
            ))
          ) : (
            <Text
              style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
              className="text-center py-4"
            >
              No exercises recorded yet
            </Text>
          )}
        </View>

        {/* Activity Type Breakdown */}
        <View
          style={{ backgroundColor: isDark ? '#18181b' : '#fff' }}
          className="p-4 rounded-xl mb-6 shadow-sm"
        >
          <Text
            className="text-lg font-semibold"
            style={{ color: isDark ? '#fff' : '#111' }}
          >
            Activity Types
          </Text>
          {Object.entries(typeCounts).length > 0 ? (
            Object.entries(typeCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <View
                  key={type}
                  className="flex-row justify-between items-center py-2"
                >
                  <Text
                    style={{ color: isDark ? '#e5e5e5' : '#374151' }}
                    className="capitalize"
                  >
                    {type.replace('-', ' ')}
                  </Text>
                  <Text
                    className="font-semibold"
                    style={{ color: isDark ? '#fff' : '#111' }}
                  >
                    {count}
                  </Text>
                </View>
              ))
          ) : (
            <Text
              style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
              className="text-center py-4"
            >
              No activities yet
            </Text>
          )}
        </View>

        {/* Most Common Type */}
        <View
          style={{ backgroundColor: isDark ? '#18181b' : '#fff' }}
          className="p-4 rounded-xl mb-6 shadow-sm"
        >
          <Text
            className="text-lg font-semibold"
            style={{ color: isDark ? '#fff' : '#111' }}
          >
            Most Common Activity Type
          </Text>
          <Text
            style={{ color: isDark ? '#e5e5e5' : '#374151' }}
            className="capitalize"
          >
            {mostCommonType.replace('-', ' ')}
          </Text>
        </View>

        {/* Recent Activity */}
        <View
          style={{ backgroundColor: isDark ? '#18181b' : '#fff' }}
          className="p-4 rounded-xl mb-6 shadow-sm"
        >
          <Text
            className="text-lg font-semibold"
            style={{ color: isDark ? '#fff' : '#111' }}
          >
            Recent Activity
          </Text>
          {recentActivities.slice(0, 5).map(activity => (
            <View
              key={activity.id}
              className="flex-row items-center py-2 border-b border-gray-100"
            >
              <Text className="text-2xl mr-3">{activity.emoji || '💪'}</Text>
              <View className="flex-1">
                <Text
                  className="font-medium"
                  style={{ color: isDark ? '#fff' : '#111' }}
                >
                  {activity.name || activity.type}
                </Text>
                <Text
                  style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
                  className="text-sm"
                >
                  {dayjs(activity.date).format('MMM D')}
                </Text>
              </View>
              <View
                className={`w-3 h-3 rounded-full ${activity.completed ? 'bg-green-500' : 'bg-gray-300'}`}
              />
            </View>
          ))}
          {recentActivities.length === 0 && (
            <Text
              style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
              className="text-center py-4"
            >
              No recent activities
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
