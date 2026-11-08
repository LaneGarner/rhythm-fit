import React from 'react';
import { Text, View } from 'react-native';
import ReAnimated, {
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';
import { Activity } from '../types/activity';
import { useTheme } from '../theme/ThemeContext';
import {
  buildExecutionUnits,
  ExecutionSetChange,
} from '../utils/workoutExecution';
import { getSupersetLabel } from '../utils/supersetUtils';
import SetCard from './SetCard';
import SetCompletionButton from './SetCompletionButton';
import WorkoutSetSummary from './WorkoutSetSummary';
import { CompletedDivider } from './CompletedDivider';
import { DEFAULT_TRACKING_FIELDS } from '../types/activity';

export default function WorkoutExecutionSets({
  activities,
  grouped = false,
  onChange,
  onOpenPlateCalculator,
}: {
  activities: Activity[];
  grouped?: boolean;
  onChange: (changes: ExecutionSetChange[]) => void;
  onOpenPlateCalculator?: (activityId: string, setId: string) => void;
}) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const units = buildExecutionUnits(activities, grouped);
  const completed = units.filter(unit => unit.completed).length;
  const firstCompleted = units.findIndex(unit => unit.completed);
  const groupLabel = getSupersetLabel(activities.length);
  return (
    <View>
      <WorkoutSetSummary
        label={grouped ? 'Rounds' : 'Sets'}
        completed={completed}
        total={units.length}
      />
      {units.map((unit, position) => (
        <ReAnimated.View
          key={unit.id}
          layout={reduceMotion ? undefined : LinearTransition.duration(300)}
        >
          {position === firstCompleted && (
            <CompletedDivider count={completed} />
          )}
          {grouped && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12,
                marginTop: position > 0 ? 8 : 0,
              }}
            >
              <View
                style={{ flex: 1, height: 1, backgroundColor: colors.border }}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: colors.textSecondary,
                }}
              >
                {groupLabel} {unit.number}
              </Text>
              <View
                style={{ flex: 1, height: 1, backgroundColor: colors.border }}
              />
            </View>
          )}
          {unit.entries.map(({ activity, set, setIndex }) => (
            <SetCard
              key={`${activity.id}-${set.id}`}
              set={set}
              index={setIndex}
              title={grouped ? activity.name : undefined}
              trackingFields={
                activity.trackingFields ||
                DEFAULT_TRACKING_FIELDS[activity.type]
              }
              activityType={activity.type}
              onUpdateSet={(setId, updates) =>
                onChange([{ activityId: activity.id, setId, updates }])
              }
              onShowOptions={() => {}}
              onOpenPlateCalculator={
                onOpenPlateCalculator
                  ? setId => onOpenPlateCalculator(activity.id, setId)
                  : undefined
              }
              showCompletionButton={!grouped}
              readOnly
            />
          ))}
          {grouped && (
            <SetCompletionButton
              completed={unit.completed}
              label={`${groupLabel} ${unit.number}`}
              marginTop={0}
              onPress={() =>
                onChange(
                  unit.entries.map(({ activity, set }) => ({
                    activityId: activity.id,
                    setId: set.id,
                    updates: { completed: !unit.completed },
                  }))
                )
              }
            />
          )}
        </ReAnimated.View>
      ))}
      {!units.length && (
        <Text
          style={{
            textAlign: 'center',
            paddingVertical: 32,
            color: colors.textSecondary,
          }}
        >
          No sets yet. Tap "Edit" to add sets.
        </Text>
      )}
    </View>
  );
}
