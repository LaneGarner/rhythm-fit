import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ActivityForm from '../components/ActivityForm';
import {
  addActivity,
  deleteActivity,
  removeFromSuperset,
  swapSupersetOrder,
  updateActivity,
} from '../redux/activitySlice';
import { RootState } from '../redux/store';
import { useAuth } from '../context/AuthContext';
import { pushActivityChange } from '../services/syncService';
import { useTheme } from '../theme/ThemeContext';
import { Activity, RecurringConfig } from '../types/activity';
import {
  generateSupersetId,
  getNextSupersetPosition,
  getSupersetActivities,
  getSupersetLabel,
} from '../utils/supersetUtils';

dayjs.extend(isSameOrAfter);

export default function EditActivityScreen({ navigation, route }: any) {
  const { activityId, supersetId: paramSupersetId } = route.params;
  const dispatch = useDispatch();
  const { getAccessToken } = useAuth();
  const { colorScheme, colors } = useTheme();
  const isDark = colorScheme === 'dark';

  const allActivities = useSelector(
    (state: RootState) => state.activities.data
  );
  const activity = allActivities.find(a => a.id === activityId);

  // Determine if we're in superset edit mode
  const resolvedSupersetId = paramSupersetId || activity?.supersetId;

  // Superset mode state
  const [activeIndex, setActiveIndex] = useState(0);
  const [editedActivities, setEditedActivities] = useState<
    Map<string, Activity>
  >(new Map());
  const [pendingRemovals, setPendingRemovals] = useState<string[]>([]);
  const [pendingAdditions, setPendingAdditions] = useState<Activity[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // Get current superset activities from Redux (live)
  const supersetActivitiesFromRedux = useMemo(() => {
    if (!resolvedSupersetId) return [];
    return getSupersetActivities(allActivities, resolvedSupersetId);
  }, [allActivities, resolvedSupersetId]);

  // Build the working list: Redux activities minus removals plus additions
  const workingActivities = useMemo(() => {
    const filtered = supersetActivitiesFromRedux.filter(
      a => !pendingRemovals.includes(a.id)
    );
    return [...filtered, ...pendingAdditions];
  }, [supersetActivitiesFromRedux, pendingRemovals, pendingAdditions]);

  // The currently selected activity for the form
  const currentActivity = useMemo(() => {
    if (isAddingNew) return undefined;
    const act = workingActivities[activeIndex];
    if (!act) return workingActivities[0];
    // If we have local edits for this activity, use those
    const edited = editedActivities.get(act.id);
    return edited || act;
  }, [workingActivities, activeIndex, editedActivities, isAddingNew]);

  const isSuperset = !!resolvedSupersetId && workingActivities.length > 0;

  // ── Single activity helpers (unchanged from original) ──

  const getBaseId = (id: string): string => {
    const match = id.match(/^(.+)_\d+$/);
    return match ? match[1] : id;
  };

  const getRelatedActivities = (baseId: string): Activity[] => {
    return allActivities.filter(a => {
      const aBaseId = getBaseId(a.id);
      return aBaseId === baseId || a.id === baseId;
    });
  };

  const createRecurringActivities = (
    baseActivity: Activity,
    config: RecurringConfig
  ): Activity[] => {
    const newActivities: Activity[] = [];

    if (config.pattern === 'daily') {
      for (let i = 0; i < config.occurrences!; i++) {
        const activityDate = dayjs(config.startDate).add(i, 'day');
        newActivities.push({
          ...baseActivity,
          id: `${baseActivity.id}_${i}`,
          date: activityDate.format('YYYY-MM-DD'),
          recurring: config,
        });
      }
    } else if (config.pattern === 'weekly') {
      if (config.frequency === 'this') {
        const start = dayjs(config.startDate);
        (config.daysOfWeek || []).forEach((dow, i) => {
          const date = start.day(dow);
          newActivities.push({
            ...baseActivity,
            id: `${baseActivity.id}_${i}`,
            date: date.format('YYYY-MM-DD'),
            recurring: config,
          });
        });
      } else {
        const weeks = config.occurrences || 1;
        const startDateObj = dayjs(config.startDate);
        let actIdx = 0;

        for (let week = 0; week < weeks; week++) {
          for (const dayOfWeek of config.daysOfWeek || []) {
            const weekStart = startDateObj.add(week, 'week').startOf('week');
            const activityDate = weekStart.day(dayOfWeek);

            if (activityDate.isSameOrAfter(startDateObj, 'day')) {
              newActivities.push({
                ...baseActivity,
                id: `${baseActivity.id}_${actIdx}`,
                date: activityDate.format('YYYY-MM-DD'),
                recurring: config,
              });
              actIdx++;
            }
          }
        }
      }
    }

    return newActivities;
  };

  // ── Single activity handlers ──

  const handleSingleDelete = () => {
    if (!activity) return;

    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this activity? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            navigation.navigate('Main', {
              screen: 'Weekly',
              params: {
                screen: 'Day',
                params: { date: activity.date },
              },
            });
            dispatch(deleteActivity(activityId));
            try {
              const token = await getAccessToken();
              if (token) {
                await pushActivityChange(token, activity, true);
              }
            } catch (err) {
              console.error('Failed to sync deletion:', err);
            }
          },
        },
      ]
    );
  };

  const handleSingleSave = (
    updatedActivity: Activity,
    recurringConfig?: RecurringConfig
  ) => {
    if (!activity) return;

    const oldConfig = activity.recurring;
    const configChanged =
      JSON.stringify(oldConfig) !== JSON.stringify(recurringConfig);

    if (recurringConfig && configChanged) {
      const baseId = getBaseId(activity.id);
      const relatedActivities = getRelatedActivities(baseId);
      const originalStartDate = activity.recurring?.startDate;
      const targetDate =
        originalStartDate || recurringConfig.startDate || activity.date;

      relatedActivities.forEach(a => {
        dispatch(deleteActivity(a.id));
      });

      const newBaseId = Date.now().toString();
      const baseActivityForRecurring: Activity = {
        ...updatedActivity,
        id: newBaseId,
        completed: false,
      };

      const newActivities = createRecurringActivities(
        baseActivityForRecurring,
        recurringConfig
      );
      newActivities.forEach(a => {
        dispatch(addActivity(a));
      });

      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'Main',
            state: {
              routes: [
                {
                  name: 'Weekly',
                  state: {
                    routes: [
                      { name: 'WeeklyHome' },
                      { name: 'Day', params: { date: targetDate } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      });
    } else {
      const finalActivity: Activity = {
        ...updatedActivity,
        id: activity.id,
        completed: activity.completed,
        recurring: recurringConfig || undefined,
        supersetId: activity.supersetId,
        supersetPosition: activity.supersetPosition,
        order: activity.order,
      };
      dispatch(updateActivity(finalActivity));
      navigation.goBack();
    }
  };

  // ── Superset handlers ──

  const handleSupersetActivitySave = useCallback(
    (updatedActivity: Activity) => {
      if (!currentActivity) return;

      // Store edits locally
      const finalActivity: Activity = {
        ...updatedActivity,
        id: currentActivity.id,
        completed: currentActivity.completed,
        supersetId: currentActivity.supersetId,
        supersetPosition: currentActivity.supersetPosition,
        order: currentActivity.order,
      };

      setEditedActivities(prev => {
        const next = new Map(prev);
        next.set(currentActivity.id, finalActivity);
        return next;
      });

      // Auto-advance to next activity if not at the end
      if (activeIndex < workingActivities.length - 1) {
        setActiveIndex(activeIndex + 1);
        setFormKey(prev => prev + 1);
      }
    },
    [currentActivity, activeIndex, workingActivities.length]
  );

  const handleSupersetSaveAll = useCallback(async () => {
    // Update modified existing activities
    for (const [, edited] of editedActivities) {
      if (!pendingAdditions.find(a => a.id === edited.id)) {
        dispatch(updateActivity(edited));
      }
    }

    // Process removals
    for (const removedId of pendingRemovals) {
      dispatch(removeFromSuperset(removedId));
    }

    // Process additions
    for (const newAct of pendingAdditions) {
      const edited = editedActivities.get(newAct.id);
      dispatch(addActivity(edited || newAct));
    }

    navigation.goBack();
  }, [
    editedActivities,
    pendingRemovals,
    pendingAdditions,
    dispatch,
    navigation,
  ]);

  const handleRemoveFromSuperset = useCallback(
    (removeId: string) => {
      // Count remaining after removal
      const remainingCount =
        workingActivities.filter(a => a.id !== removeId).length;

      if (remainingCount < 2) {
        Alert.alert(
          'Cannot Remove',
          'A superset must have at least 2 exercises.'
        );
        return;
      }

      // Check if it's a pending addition (not yet saved)
      const isPending = pendingAdditions.find(a => a.id === removeId);
      if (isPending) {
        setPendingAdditions(prev => prev.filter(a => a.id !== removeId));
      } else {
        setPendingRemovals(prev => [...prev, removeId]);
      }

      // Also clean from edited
      setEditedActivities(prev => {
        const next = new Map(prev);
        next.delete(removeId);
        return next;
      });

      // Adjust active index if needed
      if (activeIndex >= remainingCount) {
        setActiveIndex(remainingCount - 1);
      }
      setFormKey(prev => prev + 1);
    },
    [workingActivities, pendingAdditions, activeIndex]
  );

  const handleAddExercise = useCallback(() => {
    setIsAddingNew(true);
    setFormKey(prev => prev + 1);
  }, []);

  const handleNewExerciseSave = useCallback(
    (newActivity: Activity) => {
      const ssId =
        resolvedSupersetId || generateSupersetId();
      const nextPosition = getNextSupersetPosition(workingActivities);
      const date = workingActivities[0]?.date || activity?.date;

      const activityWithSuperset: Activity = {
        ...newActivity,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        date: date || newActivity.date,
        supersetId: ssId,
        supersetPosition: nextPosition,
      };

      setPendingAdditions(prev => [...prev, activityWithSuperset]);
      setEditedActivities(prev => {
        const next = new Map(prev);
        next.set(activityWithSuperset.id, activityWithSuperset);
        return next;
      });
      setIsAddingNew(false);
      setActiveIndex(workingActivities.length); // select the newly added one
      setFormKey(prev => prev + 1);
    },
    [resolvedSupersetId, workingActivities, activity]
  );

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (toIndex < 0 || toIndex >= workingActivities.length) return;

      const act1 = workingActivities[fromIndex];
      const act2 = workingActivities[toIndex];

      if (!act1 || !act2 || !resolvedSupersetId) return;

      // For pending additions, just reorder locally
      const isPending1 = pendingAdditions.find(a => a.id === act1.id);
      const isPending2 = pendingAdditions.find(a => a.id === act2.id);

      if (isPending1 || isPending2) {
        // Local reorder only — swap positions in editedActivities
        const pos1 = act1.supersetPosition || fromIndex + 1;
        const pos2 = act2.supersetPosition || toIndex + 1;

        setEditedActivities(prev => {
          const next = new Map(prev);
          next.set(act1.id, { ...act1, supersetPosition: pos2 });
          next.set(act2.id, { ...act2, supersetPosition: pos1 });
          return next;
        });

        if (isPending1) {
          setPendingAdditions(prev =>
            prev.map(a =>
              a.id === act1.id ? { ...a, supersetPosition: pos2 } : a
            )
          );
        }
        if (isPending2) {
          setPendingAdditions(prev =>
            prev.map(a =>
              a.id === act2.id ? { ...a, supersetPosition: pos1 } : a
            )
          );
        }
      } else {
        dispatch(
          swapSupersetOrder({
            supersetId: resolvedSupersetId,
            id1: act1.id,
            id2: act2.id,
          })
        );
      }

      setActiveIndex(toIndex);
      setFormKey(prev => prev + 1);
    },
    [workingActivities, resolvedSupersetId, pendingAdditions, dispatch]
  );

  const handleDeleteSuperset = useCallback(() => {
    const date = workingActivities[0]?.date || activity?.date;
    Alert.alert(
      'Delete Superset',
      `Are you sure you want to delete all ${workingActivities.length} activities in this superset?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            navigation.navigate('Main', {
              screen: 'Weekly',
              params: {
                screen: 'Day',
                params: { date },
              },
            });

            for (const a of supersetActivitiesFromRedux) {
              dispatch(deleteActivity(a.id));
              try {
                const token = await getAccessToken();
                if (token) {
                  await pushActivityChange(token, a, true);
                }
              } catch (err) {
                console.error('Failed to sync deletion:', err);
              }
            }
          },
        },
      ]
    );
  }, [
    workingActivities,
    supersetActivitiesFromRedux,
    activity,
    navigation,
    dispatch,
    getAccessToken,
  ]);

  const handleSupersetCancel = useCallback(() => {
    const hasChanges =
      editedActivities.size > 0 ||
      pendingRemovals.length > 0 ||
      pendingAdditions.length > 0;

    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
      return;
    }
    navigation.goBack();
  }, [editedActivities, pendingRemovals, pendingAdditions, navigation]);

  // ── Not found state ──

  if (!activity && !isSuperset) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: colors.background }}
      >
        <Text className="text-lg" style={{ color: colors.text }}>
          Activity not found
        </Text>
      </View>
    );
  }

  // ── Single activity mode (no superset) ──

  if (!isSuperset) {
    return (
      <ActivityForm
        mode="edit"
        initialActivity={activity}
        onSave={handleSingleSave}
        onCancel={() => navigation.goBack()}
        onDelete={handleSingleDelete}
      />
    );
  }

  // ── Superset edit mode ──

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          height: 132,
          paddingHorizontal: 16,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          onPress={handleSupersetCancel}
          style={{
            position: 'absolute',
            left: 16,
            top: 44,
            height: 88,
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <Text
            style={{
              color: colors.primary.main,
              fontSize: 18,
              fontWeight: '500',
            }}
          >
            Cancel
          </Text>
        </TouchableOpacity>
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 44,
            height: 88,
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: colors.text,
              textAlign: 'center',
            }}
          >
            Edit {getSupersetLabel(workingActivities.length)}
          </Text>
        </View>
        <TouchableOpacity
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          onPress={handleSupersetSaveAll}
          style={{
            position: 'absolute',
            right: 16,
            top: 44,
            height: 88,
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <Text
            style={{
              color: colors.primary.main,
              fontSize: 18,
              fontWeight: '600',
            }}
          >
            Save
          </Text>
        </TouchableOpacity>
      </View>

      {/* Activity pill strip */}
      <View
        style={{
          paddingVertical: 12,
          paddingHorizontal: 16,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, alignItems: 'center' }}
        >
          {workingActivities.map((act, index) => {
            const isActive = !isAddingNew && index === activeIndex;
            const edited = editedActivities.get(act.id);
            const displayAct = edited || act;

            return (
              <TouchableOpacity
                key={act.id}
                onPress={() => {
                  setIsAddingNew(false);
                  setActiveIndex(index);
                  setFormKey(prev => prev + 1);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                activeOpacity={0.7}
                accessibilityLabel={`Edit ${displayAct.name}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingLeft: 12,
                  paddingRight: 6,
                  paddingVertical: 10,
                  minHeight: 44,
                  borderRadius: 20,
                  backgroundColor: isActive
                    ? isDark
                      ? '#23263a'
                      : '#e0e7ff'
                    : colors.surface,
                  borderWidth: 1,
                  borderColor: isActive
                    ? colors.primary.main
                    : colors.border,
                  gap: 6,
                }}
              >
                  <Text style={{ fontSize: 16 }}>
                    {displayAct.emoji || '💪'}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: colors.text,
                      maxWidth: 100,
                    }}
                    numberOfLines={1}
                  >
                    {displayAct.name}
                  </Text>

                {/* Reorder buttons */}
                {index > 0 && (
                  <TouchableOpacity
                    onPress={() => handleReorder(index, index - 1)}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                    accessibilityLabel={`Move ${displayAct.name} left`}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
                {index < workingActivities.length - 1 && (
                  <TouchableOpacity
                    onPress={() => handleReorder(index, index + 1)}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                    accessibilityLabel={`Move ${displayAct.name} right`}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}

                {/* Remove button */}
                <TouchableOpacity
                  onPress={() => handleRemoveFromSuperset(act.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
                  accessibilityLabel={`Remove ${displayAct.name} from superset`}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

          {/* Add exercise button */}
          <TouchableOpacity
            onPress={handleAddExercise}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 10,
              minHeight: 44,
              borderRadius: 20,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: isAddingNew ? colors.primary.main : colors.border,
              backgroundColor: isAddingNew
                ? isDark
                  ? '#23263a'
                  : '#e0e7ff'
                : colors.surface,
              gap: 4,
            }}
            accessibilityLabel="Add exercise to superset"
            accessibilityRole="button"
          >
            <Ionicons
              name="add"
              size={18}
              color={
                isAddingNew ? colors.primary.main : colors.textSecondary
              }
            />
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: isAddingNew
                  ? colors.primary.main
                  : colors.textSecondary,
              }}
            >
              Add
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Activity Form */}
      <View style={{ flex: 1 }}>
        {isAddingNew ? (
          <ActivityForm
            key={`add-${formKey}`}
            mode="create"
            initialActivity={
              { date: workingActivities[0]?.date || activity?.date } as any
            }
            onSave={handleNewExerciseSave}
            onCancel={() => {
              setIsAddingNew(false);
              setFormKey(prev => prev + 1);
            }}
            saveButtonLabel="Add Exercise"
            headerTitle="New Exercise"
            hideHeader
            hideDate
            hideRecurring
          />
        ) : currentActivity ? (
          <ActivityForm
            key={`edit-${currentActivity.id}-${formKey}`}
            mode="edit"
            initialActivity={currentActivity}
            onSave={handleSupersetActivitySave}
            onCancel={handleSupersetCancel}
            onDelete={() => handleRemoveFromSuperset(currentActivity.id)}
            deleteButtonLabel="Remove from Superset"
            saveButtonLabel="Update Exercise"
            hideHeader
            hideDate
            hideRecurring
          />
        ) : null}
      </View>

      {/* Delete Superset link - only visible when scrolled to bottom */}
      {!isAddingNew && (
        <View
          style={{
            paddingVertical: 16,
            paddingHorizontal: 16,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <TouchableOpacity onPress={handleDeleteSuperset}>
            <Text
              style={{
                color: '#ef4444',
                textAlign: 'center',
                fontSize: 16,
              }}
            >
              Delete Superset
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
