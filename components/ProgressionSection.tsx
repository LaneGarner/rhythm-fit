import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ReAnimated, {
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { formatSetSummary, getPreviousDays } from '../services/statsService';
import { useTheme } from '../theme/ThemeContext';
import { Activity } from '../types/activity';

const DAY_LIMIT = 5;

interface ProgressionSectionProps {
  activity: Pick<Activity, 'id' | 'name' | 'date'>;
  title?: string;
}

export const ProgressionSection: React.FC<ProgressionSectionProps> = ({
  activity,
  title,
}) => {
  const { colors } = useTheme();
  const activities = useSelector((state: RootState) => state.activities.data);
  const navigation = useNavigation<any>();
  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);

  const sessions = useMemo(
    () =>
      getPreviousDays(
        activities,
        { id: activity.id, name: activity.name, date: activity.date },
        DAY_LIMIT
      ),
    [activities, activity.id, activity.name, activity.date]
  );

  return (
    <ReAnimated.View
      layout={reduceMotion ? undefined : LinearTransition.duration(250)}
      style={{
        borderRadius: 8,
        backgroundColor: colors.surface,
        overflow: 'hidden',
      }}
    >
      <TouchableOpacity
        onPress={() => setExpanded(prev => !prev)}
        accessibilityRole="button"
        accessibilityLabel={`${title || 'Progression'}, last ${DAY_LIMIT} days`}
        accessibilityState={{ expanded }}
        accessibilityHint={expanded ? 'Collapse' : 'Expand'}
        hitSlop={14}
        style={{
          minHeight: 44,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Ionicons
          name="trending-up-outline"
          size={18}
          color={colors.textSecondary}
          style={{ marginRight: 6 }}
        />
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: '500',
            color: colors.textSecondary,
          }}
        >
          {title || 'Progression'}
        </Text>
        {sessions.length > 0 && (
          <Text
            style={{ fontSize: 13, color: colors.textTertiary, marginRight: 8 }}
          >
            {sessions.length} {sessions.length === 1 ? 'day' : 'days'}
          </Text>
        )}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          {sessions.length === 0 ? (
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>
              No previous sessions yet.
            </Text>
          ) : (
            sessions.map((session, index) => (
              <View
                key={session.day}
                style={{
                  paddingVertical: 10,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: colors.text,
                    }}
                  >
                    {dayjs(session.day).format(
                      dayjs(session.day).isSame(dayjs(), 'year')
                        ? 'ddd, MMM D'
                        : 'ddd, MMM D, YYYY'
                    )}
                  </Text>
                  {index === 0 && (
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 999,
                        backgroundColor: colors.primary.background,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: colors.primary.main,
                        }}
                      >
                        Most recent
                      </Text>
                    </View>
                  )}
                </View>
                <View
                  style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}
                >
                  {session.sets.map((set, setIndex) => (
                    <View
                      key={set.id}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: colors.background,
                      }}
                    >
                      <Text
                        style={{ fontSize: 13, color: colors.textSecondary }}
                      >
                        {setIndex + 1}: {formatSetSummary(set)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
          {sessions.length > 0 && (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('ExerciseStats', {
                  exerciseName: activity.name,
                })
              }
              accessibilityRole="link"
              accessibilityLabel={`View all stats for ${activity.name}`}
              hitSlop={14}
              style={{
                minHeight: 44,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingBottom: 4,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingTop: 10,
              }}
            >
              <Text
                style={{
                  flexShrink: 1,
                  fontSize: 14,
                  fontWeight: '600',
                  color: colors.primary.main,
                  marginRight: 4,
                  textAlign: 'center',
                }}
              >
                View all stats for {activity.name}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.primary.main}
              />
            </TouchableOpacity>
          )}
        </View>
      )}
    </ReAnimated.View>
  );
};
