import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Keyboard,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import CollapsibleTimer from '../components/CollapsibleTimer';
import HeaderButton from '../components/HeaderButton';
import NotesCard from '../components/NotesCard';
import PlateCalculatorModal from '../components/PlateCalculatorModal';
import PlateIcon from '../components/PlateIcon';
import {
  ContentHeader,
  StickyCompactHeader,
} from '../components/StickyActivityHeader';
import { updateActivity } from '../redux/activitySlice';
import { RootState } from '../redux/store';
import { useTheme } from '../theme/ThemeContext';
import { Activity, SetData, TrackingField } from '../types/activity';
import {
  buildSupersetRounds,
  getMaxSetCount,
  getSupersetActivities,
  getSupersetEmojis,
  getSupersetLabel,
  isSupersetComplete,
} from '../utils/supersetUtils';
import { secondsToTimeString, timeStringToSeconds } from '../utils/timeFormat';

export default function SupersetExecutionScreen({ navigation, route }: any) {
  const { supersetId } = route.params;
  const dispatch = useDispatch();
  const { colorScheme, colors } = useTheme();
  const isDark = colorScheme === 'dark';

  const activities = useSelector((state: RootState) => state.activities.data);
  const supersetActivities = getSupersetActivities(activities, supersetId);

  // Local state for sets (mirrors Redux but allows batched updates)
  const [localSets, setLocalSets] = useState<Map<string, SetData[]>>(
    new Map(supersetActivities.map(a => [a.id, a.sets || []]))
  );

  // Sync local sets when activities change from outside
  useEffect(() => {
    setLocalSets(new Map(supersetActivities.map(a => [a.id, a.sets || []])));
  }, [supersetActivities.map(a => a.id).join(',')]);

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showPlateCalculator, setShowPlateCalculator] = useState(false);
  const [activeSetInfo, setActiveSetInfo] = useState<{
    activityId: string;
    setId: string;
  } | null>(null);

  const scrollViewRef = useRef<typeof Animated.ScrollView.prototype | null>(
    null
  );
  const setInputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const scrollY = useRef(new Animated.Value(0)).current;

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      'keyboardWillShow',
      e => {
        setIsKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHideListener = Keyboard.addListener(
      'keyboardWillHide',
      () => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

  if (supersetActivities.length === 0) {
    return (
      <View
        className={`flex-1 justify-center items-center ${
          isDark ? 'bg-gray-900' : 'bg-gray-50'
        }`}
      >
        <Text className={`text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Superset not found
        </Text>
      </View>
    );
  }

  const supersetRounds = buildSupersetRounds(supersetActivities);
  const maxSets = getMaxSetCount(supersetActivities);

  const handleUpdateSet = (
    activityId: string,
    setId: string,
    updates: Partial<SetData>
  ) => {
    const activity = supersetActivities.find(a => a.id === activityId);
    if (!activity) return;

    const updatedSets = (activity.sets || []).map(set =>
      set.id === setId ? { ...set, ...updates } : set
    );

    // Update local state
    setLocalSets(prev => new Map(prev).set(activityId, updatedSets));

    // Save to Redux
    dispatch(
      updateActivity({
        ...activity,
        sets: updatedSets,
      })
    );

    // Check if all activities are complete
    const allComplete =
      supersetActivities.every(a => {
        if (a.id === activityId) {
          return updatedSets.every(s => s.completed);
        }
        return a.completed || (a.sets?.every(s => s.completed) ?? true);
      }) && supersetActivities.length > 0;

    if (allComplete) {
      // Mark all activities as complete
      supersetActivities.forEach(a => {
        if (!a.completed) {
          dispatch(
            updateActivity({
              ...a,
              completed: true,
              sets: a.id === activityId ? updatedSets : a.sets,
            })
          );
        }
      });

      Alert.alert('Nice Work!', 'Superset complete!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  const handleAddSupersetRound = () => {
    // Add a new set to each activity in the superset
    supersetActivities.forEach(activity => {
      const newSet: SetData = {
        id: `${activity.id}-${Date.now()}`,
        reps: 0,
        weight: 0,
        completed: false,
      };

      const updatedSets = [...(activity.sets || []), newSet];

      dispatch(
        updateActivity({
          ...activity,
          sets: updatedSets,
        })
      );
    });
  };

  const handleAddSetToActivity = (activityId: string) => {
    const activity = supersetActivities.find(a => a.id === activityId);
    if (!activity) return;

    const newSet: SetData = {
      id: `${activityId}-${Date.now()}`,
      reps: 0,
      weight: 0,
      completed: false,
    };

    const updatedSets = [...(activity.sets || []), newSet];

    dispatch(
      updateActivity({
        ...activity,
        sets: updatedSets,
      })
    );
  };

  const handleDeleteSet = (activityId: string, setId: string) => {
    const activity = supersetActivities.find(a => a.id === activityId);
    if (!activity) return;

    const updatedSets = (activity.sets || []).filter(set => set.id !== setId);

    dispatch(
      updateActivity({
        ...activity,
        sets: updatedSets,
      })
    );
  };

  const handleCompleteAll = () => {
    supersetActivities.forEach(activity => {
      const completedSets = (activity.sets || []).map(set => ({
        ...set,
        completed: true,
      }));

      dispatch(
        updateActivity({
          ...activity,
          completed: true,
          sets: completedSets,
        })
      );
    });

    Alert.alert('Nice Work!', 'Superset complete!', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const handlePlateWeightSelect = (weight: number) => {
    if (activeSetInfo) {
      handleUpdateSet(activeSetInfo.activityId, activeSetInfo.setId, {
        weight,
      });
    }
    setShowPlateCalculator(false);
    setActiveSetInfo(null);
  };

  const showSetOptions = (activityId: string, set: SetData) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Delete'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 1,
          userInterfaceStyle: isDark ? 'dark' : 'light',
        },
        buttonIndex => {
          if (buttonIndex === 1) {
            handleDeleteSet(activityId, set.id);
          }
        }
      );
    } else {
      Alert.alert('Set Options', 'What would you like to do?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteSet(activityId, set.id),
        },
      ]);
    }
  };

  const scrollToSetInput = (refKey: string) => {
    const inputRef = setInputRefs.current[refKey];
    if (inputRef && scrollViewRef.current) {
      inputRef.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({
            y: y - 100,
            animated: true,
          });
        },
        () => {}
      );
    }
  };

  const fieldConfig: Record<TrackingField, { label: string; unit?: string }> = {
    weight: { label: 'Weight', unit: 'lbs' },
    reps: { label: 'Reps' },
    time: { label: 'Time', unit: 'm:ss' },
    distance: { label: 'Distance', unit: 'mi' },
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 72,
          paddingBottom: 16,
          paddingHorizontal: 16,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <HeaderButton label="Back" onPress={() => navigation.goBack()} />
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
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
            Activity
          </Text>
        </View>
        {/* Spacer to balance the header */}
        <View style={{ width: 50 }} />
      </View>

      {/* Content area wrapper for sticky header positioning */}
      <View style={{ flex: 1, position: 'relative' }}>
        {/* Sticky compact header - positioned at top of content area */}
        <StickyCompactHeader
          emoji=""
          title={getSupersetEmojis(supersetActivities)}
          subtitle={getSupersetLabel(supersetActivities.length)}
          badge={getSupersetLabel(supersetActivities.length)}
          scrollY={scrollY}
        />

        <Animated.ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{
            paddingBottom: isKeyboardVisible ? keyboardHeight + 100 : 200,
          }}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {/* Large content header - fades out on scroll */}
          <ContentHeader
            emoji=""
            title={getSupersetEmojis(supersetActivities)}
            subtitle={getSupersetLabel(supersetActivities.length)}
            badge={getSupersetLabel(supersetActivities.length)}
            scrollY={scrollY}
          />

          <View className="p-4" style={{ gap: 24 }}>
            {/* Timer - Collapsible */}
            <CollapsibleTimer
              activityId={supersetId}
              activityName={getSupersetLabel(supersetActivities.length)}
            />

            {/* Notes - combined from all activities */}
            {supersetActivities.some(a => a.notes) && (
              <NotesCard
                notes={supersetActivities
                  .filter(a => a.notes)
                  .map(a => `${a.emoji || '💪'} ${a.name}: ${a.notes}`)
                  .join('\n\n')}
              />
            )}

            {/* Superset Rounds */}
            {supersetRounds.map((round, roundIndex) => (
              <View key={round.roundNumber}>
                {/* Round Header */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 12,
                    marginTop: roundIndex > 0 ? 8 : 0,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: colors.border,
                    }}
                  />
                  <Text
                    style={{
                      paddingHorizontal: 12,
                      fontSize: 14,
                      fontWeight: '600',
                      color: colors.textSecondary,
                    }}
                  >
                    Superset {round.roundNumber}
                  </Text>
                  <View
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: colors.border,
                    }}
                  />
                </View>

                {/* Sets for each activity in this round */}
                {round.sets.map(
                  ({ activity, set, setIndex }, activityIndex) => {
                    const isLastActivity =
                      activityIndex === round.sets.length - 1;
                    const accentColor = set?.completed
                      ? colors.success.main
                      : colors.primary.main;

                    if (!set) {
                      // No set for this activity in this round - show add set option
                      return (
                        <View key={`${activity.id}-empty-${setIndex}`}>
                          <TouchableOpacity
                            onPress={() => handleAddSetToActivity(activity.id)}
                            className={`p-4 rounded-lg ${
                              isDark ? 'bg-gray-800' : 'bg-white'
                            } shadow-sm`}
                            style={{
                              borderWidth: 2,
                              borderStyle: 'dashed',
                              borderColor: colors.border,
                            }}
                          >
                            <View className="flex-row items-center justify-between">
                              <View className="flex-row items-center flex-1">
                                <Text className="text-xl mr-2">
                                  {activity.emoji || '💪'}
                                </Text>
                                <Text
                                  className={`text-base font-medium ${
                                    isDark ? 'text-gray-400' : 'text-gray-500'
                                  }`}
                                  numberOfLines={1}
                                >
                                  {activity.name}
                                </Text>
                              </View>
                              <View className="flex-row items-center">
                                <Ionicons
                                  name="add-circle-outline"
                                  size={20}
                                  color={colors.primary.main}
                                />
                                <Text
                                  style={{
                                    color: colors.primary.main,
                                    marginLeft: 4,
                                    fontWeight: '600',
                                  }}
                                >
                                  Add Set
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                          {/* Connecting line */}
                          {!isLastActivity && (
                            <View
                              style={{
                                alignItems: 'center',
                                paddingVertical: 4,
                              }}
                            >
                              <View
                                style={{
                                  width: 2,
                                  height: 16,
                                  backgroundColor: accentColor,
                                  borderRadius: 1,
                                }}
                              />
                            </View>
                          )}
                        </View>
                      );
                    }

                    const fields: TrackingField[] = activity.trackingFields || [
                      'weight',
                      'reps',
                    ];
                    const showPlateIcon =
                      fields.includes('weight') &&
                      activity.type === 'weight-training';

                    return (
                      <View key={`${activity.id}-${set.id}`}>
                        <View
                          className={`p-4 rounded-lg ${
                            isDark ? 'bg-gray-800' : 'bg-white'
                          } shadow-sm`}
                          style={{
                            borderLeftWidth: 4,
                            borderLeftColor: accentColor,
                          }}
                        >
                          {/* Activity name header */}
                          <View className="flex-row justify-between items-center mb-3">
                            <View className="flex-row items-center flex-1">
                              <Text className="text-xl mr-2">
                                {activity.emoji || '💪'}
                              </Text>
                              <Text
                                className={`text-base font-semibold ${
                                  isDark ? 'text-white' : 'text-gray-900'
                                }`}
                                numberOfLines={1}
                              >
                                {activity.name}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => showSetOptions(activity.id, set)}
                              hitSlop={{
                                top: 12,
                                bottom: 12,
                                left: 12,
                                right: 12,
                              }}
                              className="p-1"
                            >
                              <Ionicons
                                name="ellipsis-vertical"
                                size={20}
                                color={colors.textSecondary}
                              />
                            </TouchableOpacity>
                          </View>

                          {/* Set inputs */}
                          <View
                            className="flex-row flex-wrap"
                            style={{ gap: 12 }}
                          >
                            {fields.map(field => {
                              const config = fieldConfig[field];
                              const value = set[field];
                              const isWeightField =
                                field === 'weight' &&
                                activity.type === 'weight-training';

                              return (
                                <View
                                  key={field}
                                  style={{
                                    flex: 1,
                                    minWidth:
                                      fields.length > 2 ? '45%' : undefined,
                                  }}
                                >
                                  <View className="flex-row items-center mb-1">
                                    <Text
                                      className={`text-sm ${
                                        isDark
                                          ? 'text-gray-300'
                                          : 'text-gray-600'
                                      }`}
                                    >
                                      {config.label}
                                      {config.unit ? ` (${config.unit})` : ''}
                                    </Text>
                                    {isWeightField && (
                                      <TouchableOpacity
                                        onPress={() => {
                                          setActiveSetInfo({
                                            activityId: activity.id,
                                            setId: set.id,
                                          });
                                          setShowPlateCalculator(true);
                                        }}
                                        hitSlop={{
                                          top: 16,
                                          bottom: 16,
                                          left: 16,
                                          right: 16,
                                        }}
                                        style={{ marginLeft: 8 }}
                                      >
                                        <PlateIcon variant="tooltip" />
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                  <TextInput
                                    ref={ref => {
                                      setInputRefs.current[
                                        `${activity.id}-${set.id}-${field}`
                                      ] = ref;
                                    }}
                                    value={
                                      field === 'time'
                                        ? secondsToTimeString(value)
                                        : value != null
                                          ? value.toString()
                                          : ''
                                    }
                                    onChangeText={text =>
                                      handleUpdateSet(activity.id, set.id, {
                                        [field]:
                                          field === 'time'
                                            ? timeStringToSeconds(text)
                                            : text
                                              ? parseFloat(text)
                                              : undefined,
                                      })
                                    }
                                    keyboardType={
                                      field === 'time'
                                        ? 'numbers-and-punctuation'
                                        : 'numeric'
                                    }
                                    className={`px-3 py-2 border rounded-lg ${
                                      isDark
                                        ? 'bg-gray-700 border-gray-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                    placeholder={field === 'time' ? '0:00' : ''}
                                    placeholderTextColor={colors.textSecondary}
                                    returnKeyType="done"
                                    onSubmitEditing={() => Keyboard.dismiss()}
                                    onFocus={() => {
                                      setTimeout(() => {
                                        scrollToSetInput(
                                          `${activity.id}-${set.id}-${field}`
                                        );
                                      }, 100);
                                    }}
                                  />
                                </View>
                              );
                            })}
                          </View>

                          {/* Complete button */}
                          <TouchableOpacity
                            onPress={() =>
                              handleUpdateSet(activity.id, set.id, {
                                completed: !set.completed,
                              })
                            }
                            className="mt-4 px-4 py-3 rounded-lg"
                            style={{
                              backgroundColor: colors.surface,
                              borderWidth: 2,
                              borderColor: set.completed
                                ? colors.success.main
                                : colors.border,
                            }}
                          >
                            <Text
                              className="text-center font-semibold"
                              style={{
                                color: set.completed
                                  ? colors.success.main
                                  : colors.textSecondary,
                              }}
                            >
                              {set.completed ? 'Completed' : 'Mark Complete'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {/* Connecting line */}
                        {!isLastActivity && (
                          <View
                            style={{
                              alignItems: 'center',
                              paddingVertical: 4,
                            }}
                          >
                            <View
                              style={{
                                width: 2,
                                height: 16,
                                backgroundColor: accentColor,
                                borderRadius: 1,
                              }}
                            />
                          </View>
                        )}
                      </View>
                    );
                  }
                )}
              </View>
            ))}

            {/* Add Round Button */}
            <TouchableOpacity
              onPress={handleAddSupersetRound}
              style={{
                padding: 16,
                borderRadius: 8,
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: colors.border,
                alignItems: 'center',
              }}
            >
              <Ionicons
                name="add-circle-outline"
                size={24}
                color={colors.textSecondary}
              />
              <Text
                className={`mt-2 font-medium ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                Add Superset
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.ScrollView>
      </View>

      {/* Sticky Action Button */}
      <View
        className={`absolute left-0 right-0 p-4 border-t ${
          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}
        style={{
          bottom: isKeyboardVisible ? keyboardHeight : 0,
          paddingBottom: isKeyboardVisible ? 16 : 34,
          zIndex: 1000,
        }}
      >
        <TouchableOpacity
          onPress={handleCompleteAll}
          className="bg-green-500 py-3 px-6 rounded-lg"
        >
          <Text className="text-white text-center font-semibold text-lg">
            Complete All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Plate Calculator Modal */}
      <PlateCalculatorModal
        visible={showPlateCalculator}
        onClose={() => {
          setShowPlateCalculator(false);
          setActiveSetInfo(null);
        }}
        onSelectWeight={handlePlateWeightSelect}
        initialWeight={
          activeSetInfo
            ? supersetActivities
                .find(a => a.id === activeSetInfo.activityId)
                ?.sets?.find(s => s.id === activeSetInfo.setId)?.weight
            : undefined
        }
      />
    </View>
  );
}
