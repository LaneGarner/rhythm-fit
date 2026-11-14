import React, { useMemo, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, store } from '../redux/store';
import { batchUpdateActivities } from '../redux/activitySlice';
import { usePreferences } from '../context/PreferencesContext';
import { useWorkoutSession } from '../context/WorkoutSessionContext';
import { useTimerActions, useTimerMetadata } from '../context/TimerContext';
import { useTheme } from '../theme/ThemeContext';
import { useUnfinishedWorkoutNotifications } from '../hooks/useUnfinishedWorkoutNotification';
import {
  getSupersetActivities,
  getSupersetLabel,
  getSupersetNames,
} from '../utils/supersetUtils';
import {
  ExecutionSetChange,
  getExecutionOutcome,
} from '../utils/workoutExecution';
import WorkoutExecutionLayout from '../components/WorkoutExecutionLayout';
import WorkoutExecutionSets from '../components/WorkoutExecutionSets';
import PlateCalculatorModal from '../components/PlateCalculatorModal';
import { ProgressionSection } from '../components/ProgressionSection';

export default function WorkoutExecutionScreen({ navigation, route }: any) {
  const { activityId, supersetId } = route.params as {
    activityId?: string;
    supersetId?: string;
  };
  const allActivities = useSelector(
    (state: RootState) => state.activities.data
  );
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { autoRestTimer } = usePreferences();
  const timer = useTimerMetadata();
  const { startCountdown } = useTimerActions();
  const sessionControls = useWorkoutSession();
  const [plateTarget, setPlateTarget] = useState<{
    activityId: string;
    setId: string;
  } | null>(null);
  const activities = useMemo(
    () =>
      supersetId
        ? getSupersetActivities(allActivities, supersetId)
        : allActivities.filter(activity => activity.id === activityId),
    [allActivities, activityId, supersetId]
  );
  // The group hook already handles one or several activities identically.
  useUnfinishedWorkoutNotifications(activities);
  const grouped = Boolean(supersetId);
  const timerId = supersetId || activityId || '';
  const title = getSupersetNames(activities);
  const timerName = grouped ? getSupersetLabel(activities.length) : title;
  const restEnabled = activities.every(
    activity => activity.restTimerEnabled ?? autoRestTimer
  );

  const sessionIndex =
    sessionControls.session?.items.findIndex(item => item.id === timerId) ?? -1;
  const sessionItem =
    sessionIndex >= 0
      ? sessionControls.session?.items[sessionIndex]
      : undefined;
  const inSession = Boolean(sessionItem);
  const moveNext = () => {
    const next = sessionControls.advance(timerId);
    if (next) navigation.replace(next.route, next.params);
    return next;
  };
  const handleChanges = (changes: ExecutionSetChange[]) => {
    const latest = store
      .getState()
      .activities.data.filter(activity =>
        activities.some(item => item.id === activity.id)
      );
    const outcome = getExecutionOutcome(latest, changes);
    if (!outcome.updated.length) return;
    dispatch(batchUpdateActivities(outcome.updated));
    if (outcome.finished && inSession) {
      const next = moveNext();
      if (next) {
        if (inSession || restEnabled)
          sessionControls.startRest(
            next,
            sessionControls.session?.restDuration || 120
          );
      } else {
        Alert.alert(
          'Session complete',
          'Your workouts are saved. Anything left for later is still on your day.',
          [{ text: 'Done', onPress: () => navigation.goBack() }]
        );
      }
    } else if (outcome.finished) {
      Alert.alert(
        'Nice Work!',
        grouped
          ? 'Superset complete!'
          : 'All sets complete. Activity finished!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else if (outcome.startRest && (inSession || restEnabled)) {
      if (inSession && sessionItem)
        sessionControls.startRest(
          sessionItem,
          sessionControls.session?.restDuration || 120
        );
      else
        startCountdown(
          timerId,
          timerName,
          timer.targetSeconds > 0 ? timer.targetSeconds : 120
        );
    }
  };
  if (!activities.length)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: colors.text }}>Activity not found</Text>
      </View>
    );
  const notes = activities
    .filter(activity => activity.notes)
    .map(activity =>
      grouped ? `${activity.name}: ${activity.notes}` : activity.notes
    )
    .join('\n\n');
  const selectedSet = activities
    .find(activity => activity.id === plateTarget?.activityId)
    ?.sets?.find(set => set.id === plateTarget?.setId);
  return (
    <>
      <WorkoutExecutionLayout
        key={timerId}
        title={title}
        timerId={timerId}
        timerName={timerName}
        onBack={() => navigation.goBack()}
        onEdit={() =>
          navigation.navigate('EditActivity', {
            activityId: activities[0].id,
            ...(supersetId && { supersetId }),
          })
        }
        restToggle={
          inSession
            ? undefined
            : {
                enabled: restEnabled,
                onToggle: enabled =>
                  dispatch(
                    batchUpdateActivities(
                      activities.map(activity => ({
                        ...activity,
                        restTimerEnabled: enabled,
                      }))
                    )
                  ),
              }
        }
        onSkipRest={
          inSession &&
          sessionControls.session &&
          timer.activityId === timerId &&
          timer.mode === 'countDown' &&
          timer.hasTimeRemaining
            ? sessionControls.skipRest
            : undefined
        }
        notes={notes}
        progression={
          <View style={{ gap: 8 }}>
            {activities.map(activity => (
              <ProgressionSection
                key={activity.id}
                activity={activity}
                title={grouped ? `${activity.name} progression` : undefined}
              />
            ))}
          </View>
        }
      >
        {inSession && sessionControls.session && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Text style={{ flex: 1, color: colors.textSecondary }}>
              Session on · {sessionIndex + 1} of{' '}
              {sessionControls.session.items.length}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                if (!moveNext()) navigation.goBack();
              }}
              style={{ paddingVertical: 8 }}
            >
              <Text style={{ color: colors.primary.main }}>
                Skip {grouped ? 'Group' : 'Activity'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Turn session off"
              onPress={sessionControls.end}
              style={{ paddingVertical: 8 }}
            >
              <Text style={{ color: colors.textSecondary }}>Turn off</Text>
            </TouchableOpacity>
          </View>
        )}
        <WorkoutExecutionSets
          activities={activities}
          grouped={grouped}
          onChange={handleChanges}
          onOpenPlateCalculator={(activityId, setId) =>
            setPlateTarget({ activityId, setId })
          }
        />
      </WorkoutExecutionLayout>
      <PlateCalculatorModal
        visible={plateTarget !== null}
        onClose={() => setPlateTarget(null)}
        initialWeight={selectedSet?.weight}
        onSelectWeight={weight => {
          if (plateTarget)
            handleChanges([{ ...plateTarget, updates: { weight } }]);
          setPlateTarget(null);
        }}
      />
    </>
  );
}
