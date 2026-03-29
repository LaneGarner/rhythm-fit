import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import React from 'react';
import { Text, View } from 'react-native';
import { Activity } from '../types/activity';
import { palette } from '../theme/colors';
import {
  ActivityGroup,
  groupActivitiesWithSupersets,
  getSupersetLabel,
  isActivityComplete,
} from '../utils/supersetUtils';
import { formatActivitySetsSummary } from '../utils/shareUtils';
import Logo from './Logo';

interface ShareWorkoutCardProps {
  activities: Activity[];
  date: string;
  includeDetails: boolean;
}

// Dark card palette
const card = {
  bg: '#0F0F13',
  surface: '#1A1A22',
  surfaceLight: '#22222E',
  border: '#2A2A36',
  text: '#F0F0F5',
  textSecondary: '#8E8E9A',
  textTertiary: '#5C5C6A',
  accent: '#3B82F6',
  accentGlow: 'rgba(59, 130, 246, 0.15)',
  success: '#34D399',
  successGlow: 'rgba(52, 211, 153, 0.12)',
  incomplete: '#3A3A48',
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

  const formattedDate = dayjs(date).format('dddd, MMMM D');

  const renderActivityRow = (
    activity: Activity,
    isLast: boolean,
    inSuperset: boolean
  ) => {
    const completed = isActivityComplete(activity);
    const setsSummary = includeDetails
      ? formatActivitySetsSummary(activity)
      : '';

    return (
      <View
        key={activity.id}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: inSuperset ? 16 : 14,
          paddingVertical: 12,
          backgroundColor: card.surface,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: card.border,
        }}
      >
        <Text style={{ fontSize: 22, marginRight: 10 }}>
          {activity.emoji || '\uD83D\uDCAA'}
        </Text>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: completed ? card.textSecondary : card.text,
            }}
          >
            {activity.name || activity.type}
          </Text>
          {setsSummary.length > 0 && (
            <Text
              style={{
                fontSize: 12,
                color: card.textTertiary,
                marginTop: 3,
              }}
            >
              {setsSummary}
            </Text>
          )}
        </View>
        <Ionicons
          name={completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={20}
          color={completed ? card.success : card.incomplete}
        />
      </View>
    );
  };

  const renderGroup = (group: ActivityGroup, groupIndex: number) => {
    const isLastGroup = groupIndex === groups.length - 1;

    if (group.type === 'single') {
      return renderActivityRow(group.activities[0], isLastGroup, false);
    }

    // Superset group
    return (
      <View
        key={group.supersetId}
        style={{
          borderBottomWidth: isLastGroup ? 0 : 1,
          borderBottomColor: card.border,
        }}
      >
        <View style={{ flexDirection: 'row' }}>
          <View
            style={{
              width: 4,
              backgroundColor: card.accent,
              borderTopLeftRadius: 4,
              borderBottomLeftRadius: 4,
            }}
          />
          <View style={{ flex: 1 }}>
            {/* Badge */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 10,
                paddingBottom: 2,
                backgroundColor: card.surface,
              }}
            >
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: card.accentGlow,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: card.accent,
                  }}
                >
                  {getSupersetLabel(group.activities.length)}
                </Text>
              </View>
            </View>
            {group.activities.map((activity, i) =>
              renderActivityRow(
                activity,
                i === group.activities.length - 1 && isLastGroup,
                true
              )
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View
      style={{
        width: 390,
        backgroundColor: card.bg,
        borderRadius: 20,
        overflow: 'hidden',
      }}
    >
      {/* Branded header */}
      <View
        style={{
          backgroundColor: '#131318',
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: card.border,
        }}
      >
        {/* Brand stamp */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <Logo showText={false} height={28} color={card.textTertiary} />
          <View style={{ marginLeft: 4, flexDirection: 'column' }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: card.textTertiary,
                lineHeight: 16,
              }}
            >
              Rhythm Fit
            </Text>
            <Text
              style={{
                fontSize: 9,
                fontWeight: '600',
                color: card.textTertiary,
                letterSpacing: 0.3,
                opacity: 0.7,
                lineHeight: 12,
              }}
            >
              AI Workout Tracker & Coach
            </Text>
          </View>
        </View>

        {/* Date + completion pill */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: '700',
              color: card.text,
              letterSpacing: -0.3,
              flex: 1,
            }}
          >
            {formattedDate}
          </Text>
          <View
            style={{
              backgroundColor: allCompleted
                ? card.successGlow
                : card.accentGlow,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 20,
              marginLeft: 12,
              marginTop: 2,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: allCompleted ? card.success : card.accent,
              }}
            >
              {completedCount}/{totalCount}
            </Text>
          </View>
        </View>
      </View>

      {/* Activity rows */}
      <View style={{ paddingVertical: 4 }}>
        {groups.map((group, i) => renderGroup(group, i))}
      </View>
    </View>
  );
}
