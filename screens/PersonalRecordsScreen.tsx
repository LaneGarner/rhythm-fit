import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { calculatePersonalRecords } from '../services/statsService';
import { useTheme } from '../theme/ThemeContext';

export default function PersonalRecordsScreen({ navigation }: any) {
  const activities = useSelector((state: RootState) => state.activities.data);
  const { colors } = useTheme();

  const personalRecords = useMemo(
    () => calculatePersonalRecords(activities, 365),
    [activities]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 60,
          paddingBottom: 16,
          paddingHorizontal: 16,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={14}
          style={{ paddingVertical: 4, paddingRight: 16 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary.main} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', marginRight: 40 }}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: colors.text,
            }}
          >
            Personal Records
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {personalRecords.records.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Ionicons
              name="trophy-outline"
              size={48}
              color={colors.textSecondary}
            />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 16,
                marginTop: 16,
                textAlign: 'center',
              }}
            >
              No personal records yet.{'\n'}Complete some workouts to set PRs!
            </Text>
          </View>
        ) : (
          <>
            {/* Recent PRs Section */}
            {personalRecords.recentPRs.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Ionicons
                    name="flame"
                    size={18}
                    color={colors.warning.main}
                  />
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 16,
                      fontWeight: '600',
                      marginLeft: 8,
                    }}
                  >
                    Recently Broken PRs
                  </Text>
                </View>
                {personalRecords.recentPRs.map((pr) => (
                  <TouchableOpacity
                    key={`recent-${pr.exerciseName}`}
                    onPress={() =>
                      navigation.navigate('ExerciseStats', {
                        exerciseName: pr.exerciseName,
                      })
                    }
                    style={{
                      backgroundColor: colors.surface,
                      padding: 16,
                      borderRadius: 12,
                      marginBottom: 8,
                      borderLeftWidth: 3,
                      borderLeftColor: colors.warning.main,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 16,
                        fontWeight: '600',
                        marginBottom: 4,
                      }}
                    >
                      {pr.exerciseName}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View>
                        {pr.isNewWeightPR && (
                          <Text style={{ color: colors.textSecondary }}>
                            Weight: {pr.maxWeight} lbs
                          </Text>
                        )}
                        {pr.isNewRepsPR && (
                          <Text style={{ color: colors.textSecondary }}>
                            Reps: {pr.maxReps}
                          </Text>
                        )}
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={colors.textSecondary}
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* All PRs Section */}
            <View>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: '600',
                  marginBottom: 12,
                }}
              >
                All-Time Records ({personalRecords.records.length})
              </Text>
              {personalRecords.records.map((pr) => (
                <TouchableOpacity
                  key={`all-${pr.exerciseName}`}
                  onPress={() =>
                    navigation.navigate('ExerciseStats', {
                      exerciseName: pr.exerciseName,
                    })
                  }
                  style={{
                    backgroundColor: colors.surface,
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 16,
                        fontWeight: '500',
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {pr.exerciseName}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      marginTop: 8,
                      gap: 16,
                    }}
                  >
                    {pr.maxWeight > 0 && (
                      <View>
                        <Text
                          style={{ color: colors.textSecondary, fontSize: 12 }}
                        >
                          Max Weight
                        </Text>
                        <Text
                          style={{
                            color: colors.primary.main,
                            fontSize: 16,
                            fontWeight: '600',
                          }}
                        >
                          {pr.maxWeight} lbs
                        </Text>
                        <Text
                          style={{ color: colors.textSecondary, fontSize: 11 }}
                        >
                          {dayjs(pr.maxWeightDate).format('MMM D, YYYY')}
                        </Text>
                      </View>
                    )}
                    {pr.maxReps > 0 && (
                      <View>
                        <Text
                          style={{ color: colors.textSecondary, fontSize: 12 }}
                        >
                          Max Reps
                        </Text>
                        <Text
                          style={{
                            color: colors.success.main,
                            fontSize: 16,
                            fontWeight: '600',
                          }}
                        >
                          {pr.maxReps}
                        </Text>
                        <Text
                          style={{ color: colors.textSecondary, fontSize: 11 }}
                        >
                          {dayjs(pr.maxRepsDate).format('MMM D, YYYY')}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
