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
  buildExecutionUnits,
  ExecutionSetChange,
  getExecutionOutcome,
} from '../utils/workoutExecution';
import {
  buildSessionItems,
  getUpcomingActivities,
  summarizeUpcomingSets,
} from '../utils/workoutSession';
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
  const { startCountdown, stopTimer, getTimerState } = useTimerActions();
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
  const upcoming = useMemo(() => {
    if (!activities.length) return [];
    const items =
      sessionControls.session && sessionIndex >= 0
        ? sessionControls.session.items
        : buildSessionItems(allActivities, activities[0].date, true);
    const currentIndex =
      sessionIndex >= 0
        ? sessionIndex
        : items.findIndex(item => item.activityIds.includes(activities[0].id));
    return getUpcomingActivities(items, currentIndex, allActivities);
  }, [sessionControls.session, sessionIndex, activities, allActivities]);
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
    const active = getTimerState();
    const countdown = active.activityCountdown;
    if (
      active.activityId === timerId &&
      countdown &&
      changes.some(
        change =>
          change.setId === countdown.setId && change.updates.completed === true
      )
    ) {
      stopTimer();
    }
    if (outcome.finished && inSession) {
      if (!moveNext()) {
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
          inSession || buildExecutionUnits(activities, grouped).length <= 1
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
          timer.isRest &&
          timer.hasTimeRemaining
            ? sessionControls.skipRest
            : undefined
        }
        sessionBanner={inSession && sessionControls.session && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              minHeight: 48,
              paddingHorizontal: 16,
              backgroundColor: colors.warning.mutedBackground,
            }}
          >
            <Text style={{ flex: 1, color: colors.text }}>
              <Text style={{ fontWeight: '700' }}>
                Session active
              </Text>
              {'\u2002\u2009'}
              {sessionIndex + 1} of {sessionControls.session.items.length}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                if (!moveNext()) navigation.goBack();
              }}
              style={{ paddingVertical: 8 }}
            >
              <Text style={{ color: colors.text }}>
                Skip {grouped ? 'group' : 'activity'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        notes={notes}
        progression={
          <View
            style={{
              gap: 8,
              // Account for the last set card's 12 pt bottom margin.
              marginTop: !notes && activities.some(activity => activity.sets?.length)
                ? -8
                : 4,
            }}
          >
            {activities.map(activity => (
              <ProgressionSection
                key={activity.id}
                activity={activity}
                title={grouped ? `${activity.name} progression` : undefined}
              />
            ))}
            {upcoming.length > 0 && (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 12,
                  marginTop: 12,
                  gap: 6,
                }}
              >
                <Text accessibilityRole="header" style={{ color: colors.textSecondary }}>
                  Up next
                </Text>
                {upcoming.map(activity => {
                  const summary = summarizeUpcomingSets(activity);
                  return (
                    <View key={activity.id} style={{ gap: 2 }}>
                      <Text style={{ color: colors.text, fontWeight: '600' }}>
                        {activity.name}
                      </Text>
                      {!!summary && (
                        <Text style={{ color: colors.textSecondary }}>{summary}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        }
      >
        <WorkoutExecutionSets
          activities={activities}
          grouped={grouped}
          onChange={handleChanges}
          activeTimedSetId={
            timer.activityId === timerId
              ? timer.activityCountdown?.setId
              : undefined
          }
          onStartTimedSet={(setId, name, seconds) => {
            const active = getTimerState();
            if (
              active.isRunning &&
              (active.activityId !== timerId || !active.isRest)
            ) {
              Alert.alert(
                'Timer already running',
                'Pause or reset the current timer before starting another.'
              );
              return;
            }
            if (inSession && active.isRest) sessionControls.skipRest();
            startCountdown(timerId, name, seconds, setId);
          }}
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
