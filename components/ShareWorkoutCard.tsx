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
  isSupersetComplete,
  getSupersetCompletedCount,
} from '../utils/supersetUtils';
import { formatActivitySetsSummary } from '../utils/shareUtils';
import Logo from './Logo';

interface ShareWorkoutCardProps {
  activities: Activity[];
  date: string;
  includeDetails: boolean;
}

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
          backgroundColor: palette.white,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: palette.gray[100],
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
              color: completed ? palette.gray[700] : palette.black,
            }}
          >
            {activity.name || activity.type}
          </Text>
          {setsSummary.length > 0 && (
            <Text
              style={{
                fontSize: 12,
                color: palette.gray[600],
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
          color={completed ? '#22C55E' : palette.gray[200]}
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
          borderBottomColor: palette.gray[100],
        }}
      >
        {/* Superset badge + accent bar */}
        <View style={{ flexDirection: 'row' }}>
          <View
            style={{
              width: 4,
              backgroundColor: palette.ios.blue,
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
                backgroundColor: palette.white,
              }}
            >
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: '#EFF6FF',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: palette.ios.blue,
                  }}
                >
                  {getSupersetLabel(group.activities.length)}
                </Text>
              </View>
            </View>
            {/* Activities in superset */}
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
        backgroundColor: palette.gray[50],
        borderRadius: 20,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <View
        style={{
          backgroundColor: allCompleted
            ? 'rgba(52, 211, 153, 0.12)'
            : palette.white,
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: palette.gray[200],
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: '700',
            color: palette.black,
          }}
        >
          {formattedDate}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: palette.gray[500],
            marginTop: 2,
          }}
        >
          {completedCount}/{totalCount} complete
        </Text>
      </View>

      {/* Activity rows */}
      <View style={{ paddingVertical: 4 }}>
        {groups.map((group, i) => renderGroup(group, i))}
      </View>

      {/* Footer branding */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: palette.gray[200],
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          opacity: 0.55,
        }}
      >
        <Logo showText height={18} color={palette.black} />
      </View>
    </View>
  );
}
