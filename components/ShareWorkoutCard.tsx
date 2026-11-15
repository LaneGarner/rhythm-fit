import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { darkColors } from '../theme/colors';
import { Activity } from '../types/activity';
import { formatActivitySetsSummary } from '../utils/shareUtils';
import {
  groupActivitiesWithSupersets,
  getSupersetLabel,
  isActivityComplete,
} from '../utils/supersetUtils';
import Logo from './Logo';

interface ShareWorkoutCardProps {
  activities: Activity[];
  date: string;
  includeDetails: boolean;
}

const colors = {
  background: '#17181B',
  divider: '#34363C',
  text: '#F4F4F5',
  secondary: '#ADB0BA',
  accent: darkColors.primary.foreground,
  complete: darkColors.success.foreground,
};

export default function ShareWorkoutCard({
  activities,
  date,
  includeDetails,
}: ShareWorkoutCardProps) {
  const groups = groupActivitiesWithSupersets(activities);
  const completedCount = activities.filter(isActivityComplete).length;
  const totalCount = activities.length;
  const allCompleted = totalCount > 0 && completedCount === totalCount;
  const workoutDate = dayjs(date);

  return (
    <View style={styles.card}>
      <View style={styles.brand}>
        <Logo showText={false} height={24} color={colors.text} />
        <View style={styles.brandText}>
          <Text style={styles.brandName}>Rhythm Fitness</Text>
          <Text style={styles.tagline}>AI Workout Tracker &amp; Coach</Text>
        </View>
      </View>

      <View style={styles.summary}>
        <View style={styles.date}>
          <Text style={styles.weekday}>{workoutDate.format('dddd')}</Text>
          <Text style={styles.dateTitle}>{workoutDate.format('MMMM D')}</Text>
        </View>
        <View style={styles.completion}>
          <Text
            style={[
              styles.completionCount,
              allCompleted && { color: colors.complete },
            ]}
          >
            {completedCount}/{totalCount}
          </Text>
          <Text style={styles.completionLabel}>Complete</Text>
        </View>
      </View>

      {groups.map((group, index) => (
        <View
          key={group.supersetId || group.activities[0].id}
          style={[styles.group, index > 0 && styles.groupDivider]}
        >
          {group.type === 'superset' && (
            <Text style={styles.groupLabel}>
              {getSupersetLabel(group.activities.length)}
            </Text>
          )}
          {group.activities.map(activity => {
            const completed = isActivityComplete(activity);
            const details = includeDetails
              ? formatActivitySetsSummary(activity)
              : '';
            return (
              <View key={activity.id} style={styles.activityRow}>
                <View style={styles.activityContent}>
                  <Text style={styles.activityName}>
                    {activity.name || activity.type}
                  </Text>
                  {!!details && <Text style={styles.details}>{details}</Text>}
                </View>
                <Ionicons
                  name={completed ? 'checkmark' : 'ellipse-outline'}
                  size={19}
                  color={completed ? colors.complete : colors.secondary}
                />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 390,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    flexShrink: 1,
  },
  brandName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  tagline: {
    color: colors.secondary,
    fontSize: 10,
    marginTop: 2,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingBottom: 16,
    marginTop: 22,
  },
  date: {
    flex: 1,
  },
  weekday: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  dateTitle: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  completion: {
    alignItems: 'flex-end',
    paddingBottom: 3,
  },
  completionCount: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  completionLabel: {
    color: colors.secondary,
    fontSize: 11,
    marginTop: 2,
  },
  group: {
    paddingVertical: 4,
  },
  groupDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  groupLabel: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
  },
  activityContent: {
    flex: 1,
  },
  activityName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  details: {
    color: colors.secondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
});
