import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import SetCard from '../components/SetCard';
import {
  ContentHeader,
  StickyCompactHeader,
} from '../components/StickyActivityHeader';
import StickyCompactTimer from '../components/StickyCompactTimer';
import { usePreferences } from '../context/PreferencesContext';
import { useTimer } from '../context/TimerContext';
import { getActivityTypes } from '../services/activityTypeService';
import { updateActivity } from '../redux/activitySlice';
import { RootState } from '../redux/store';
import { useTheme } from '../theme/ThemeContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useUnfinishedWorkoutNotification } from '../hooks/useUnfinishedWorkoutNotification';
import {
  Activity,
  SetData,
  TrackingField,
  DEFAULT_TRACKING_FIELDS,
} from '../types/activity';

export default function ActivityExecutionScreen({ navigation, route }: any) {
  const { activityId } = route.params;
  const dispatch = useDispatch();
  const { colorScheme, colors } = useTheme();
  const { insets } = useResponsiveLayout();
  const isDark = colorScheme === 'dark';

  const activities = useSelector((state: RootState) => state.activities.data);
  const activity = activities.find(a => a.id === activityId);

  useUnfinishedWorkoutNotification(activity);

  // Global timer context (for checking if timer is running)
  const { timer, startCountdown } = useTimer();
  const { autoRestTimer } = usePreferences();
  const isTimerRunning = timer.activityId === activityId && timer.isRunning;
  const restTimerEnabled = activity?.restTimerEnabled ?? true;

  const [sets, setSets] = useState<SetData[]>(activity?.sets || []);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(activity?.completed || false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showPlateCalculator, setShowPlateCalculator] = useState(false);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [isTimerExpanded, setIsTimerExpanded] = useState(isTimerRunning);

  const scrollViewRef = useRef<typeof Animated.ScrollView.prototype | null>(
    null
  );
  const setInputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const scrollY = useRef(new Animated.Value(0)).current;

  // Helper function to get activity type label
  const getActivityTypeLabel = (type: string) => {
    const activityType = getActivityTypes().find(at => at.value === type);
    return activityType?.label || type;
  };

  // Sync local state when screen regains focus (e.g., returning from EditActivity)
  useFocusEffect(
    useCallback(() => {
      if (activity) {
        setSets(activity.sets || []);
        setIsCompleted(activity.completed || false);
      }
    }, [activity])
  );

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

  const handleAddSet = () => {
    const newSetId = Date.now().toString();
    const newSet: SetData = {
      id: newSetId,
      reps: 0,
      weight: 0,
      time: undefined,
      distance: undefined,
      completed: false,
    };
    const updatedSets = [...sets, newSet];
    setSets(updatedSets);
    setCurrentSetIndex(sets.length);

    // Auto-save progress when new set is added
    if (activity) {
      const updatedActivity: Activity = {
        ...activity,
        sets: updatedSets,
      };
      dispatch(updateActivity(updatedActivity));
    }

    // Focus the first tracking field input of the new set after render
    const fields =
      activity?.trackingFields ||
      (activity ? DEFAULT_TRACKING_FIELDS[activity.type] : ['weight', 'reps']);
    setTimeout(() => {
      setInputRefs.current[`${newSetId}-${fields[0]}`]?.focus();
    }, 100);
  };

  const handleDuplicateSet = (setToDuplicate: SetData) => {
    const newSet: SetData = {
      id: Date.now().toString(),
      reps: setToDuplicate.reps,
      weight: setToDuplicate.weight,
      time: setToDuplicate.time,
      distance: setToDuplicate.distance,
      band: setToDuplicate.band,
      completed: false,
    };
    const updatedSets = [...sets, newSet];
    setSets(updatedSets);
    setCurrentSetIndex(sets.length);

    // Auto-save progress when set is duplicated
    if (activity) {
      const updatedActivity: Activity = {
        ...activity,
        sets: updatedSets,
      };
      dispatch(updateActivity(updatedActivity));
    }
  };

  const handleUpdateSet = (setId: string, updates: Partial<SetData>) => {
    const updatedSets = sets.map(set =>
      set.id === setId ? { ...set, ...updates } : set
    );
    setSets(updatedSets);

    if (activity) {
      const allSetsComplete =
        updatedSets.length > 0 && updatedSets.every(s => s.completed);
      const shouldAutoComplete = allSetsComplete && !activity.completed;

      dispatch(
        updateActivity({
          ...activity,
          sets: updatedSets,
          completed: shouldAutoComplete ? true : activity.completed,
        })
      );

      if (shouldAutoComplete) {
        Alert.alert('🎉 Nice Work!', 'All sets complete. Activity finished!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else if (
        autoRestTimer &&
        restTimerEnabled &&
        updates.completed === true
      ) {
        const duration = timer.targetSeconds > 0 ? timer.targetSeconds : 120;
        startCountdown(activityId, activity.name, duration);
      }
    }
  };

  const handleRestTimerToggle = (enabled: boolean) => {
    if (!activity) return;
    dispatch(updateActivity({ ...activity, restTimerEnabled: enabled }));
  };

  const handleDeleteSet = (setId: string) => {
    const updatedSets = sets.filter(set => set.id !== setId);
    setSets(updatedSets);

    // Auto-save progress when set is deleted
    if (activity) {
      const updatedActivity: Activity = {
        ...activity,
        sets: updatedSets,
      };
      dispatch(updateActivity(updatedActivity));
    }
  };

  const handlePlateWeightSelect = (weight: number) => {
    if (activeSetId) {
      handleUpdateSet(activeSetId, { weight });
    }
    setShowPlateCalculator(false);
    setActiveSetId(null);
  };

  const showSetOptions = (set: SetData) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Duplicate', 'Delete'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 2,
          userInterfaceStyle: isDark ? 'dark' : 'light',
        },
        buttonIndex => {
          if (buttonIndex === 1) {
            handleDuplicateSet(set);
          } else if (buttonIndex === 2) {
            handleDeleteSet(set.id);
          }
        }
      );
    } else {
      Alert.alert('Set Options', 'What would you like to do?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Duplicate', onPress: () => handleDuplicateSet(set) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteSet(set.id),
        },
      ]);
    }
  };

  if (!activity) {
    return (
      <View
        className={`flex-1 justify-center items-center ${
          isDark ? 'bg-gray-900' : 'bg-gray-50'
        }`}
      >
        <Text className={`text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Activity not found
        </Text>
      </View>
    );
  }

  const completedSetsCount = sets.filter(set => set.completed).length;
  const totalSetsCount = sets.length;
  const allSetsComplete =
    totalSetsCount > 0 && completedSetsCount === totalSetsCount;

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
        () => {
          // Failed to measure set input position
        }
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: insets.top + 16,
          paddingBottom: 16,
          paddingLeft: Math.max(16, insets.left),
          paddingRight: Math.max(16, insets.right),
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
        <HeaderButton
          label="Edit"
          onPress={() =>
            navigation.navigate('EditActivity', { activityId: activity.id })
          }
        />
      </View>

      {/* Content area wrapper for sticky header positioning */}
      <View style={{ flex: 1, position: 'relative' }}>
        {/* Sticky compact header - positioned at top of content area */}
        <StickyCompactHeader
          activityType={activity.type}
          title={activity.name}
          subtitle={getActivityTypeLabel(activity.type)}
          scrollY={scrollY}
        />

        {/* Sticky compact timer - appears below sticky header when scrolled */}
        <StickyCompactTimer
          activityId={activity.id}
          activityName={activity.name}
          scrollY={scrollY}
          isExpanded={isTimerExpanded}
        />

        <Animated.ScrollView
          className={`flex-1`}
          contentContainerStyle={{
            paddingBottom: isKeyboardVisible ? keyboardHeight + 100 : 200,
          }}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          ref={scrollViewRef}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          {/* Large content header - fades out on scroll */}
          <ContentHeader
            activityType={activity.type}
            title={activity.name}
            subtitle={getActivityTypeLabel(activity.type)}
            scrollY={scrollY}
          />

          <View className="p-4" style={{ gap: 24 }}>
            {/* Timer - Collapsible (now hosts the auto rest toggle) */}
            <CollapsibleTimer
              activityId={activity.id}
              activityName={activity.name}
              defaultExpanded={isTimerRunning}
              onExpandedChange={setIsTimerExpanded}
              restToggle={{
                enabled: restTimerEnabled,
                onToggle: handleRestTimerToggle,
                globalEnabled: autoRestTimer,
              }}
            />

            {/* Notes */}
            <NotesCard notes={activity.notes || ''} />

            {/* Sets */}
            <View>
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <Text
                    className={`text-lg font-semibold ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    Sets ({sets.length})
                  </Text>
                  <Text
                    className="text-sm mt-1"
                    style={{
                      color: allSetsComplete
                        ? colors.success.main
                        : colors.textSecondary,
                      fontWeight: allSetsComplete ? '700' : '500',
                    }}
                  >
                    {completedSetsCount} of {totalSetsCount} sets complete
                  </Text>
                </View>
              </View>

              {/*
                INTENTIONAL: the execution screen is READ-ONLY for set values.
                Sets are displayed, not edited, here — editing happens on the
                Edit/create activity form. Do NOT remove `readOnly` to "enable
                editing" (that regression happened once in 74da89b). See memory
                "execution-screens-read-only".
              */}
              {sets.map((set, index) => (
                <SetCard
                  key={set.id}
                  set={set}
                  index={index}
                  trackingFields={
                    activity.trackingFields ||
                    DEFAULT_TRACKING_FIELDS[activity.type]
                  }
                  activityType={activity.type}
                  onUpdateSet={handleUpdateSet}
                  onShowOptions={showSetOptions}
                  onOpenPlateCalculator={setId => {
                    setActiveSetId(setId);
                    setShowPlateCalculator(true);
                  }}
                  inputRefs={setInputRefs}
                  onInputFocus={scrollToSetInput}
                  readOnly
                />
              ))}

              {sets.length === 0 && (
                <Text
                  className={`text-center py-8 ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  No sets yet. Tap "Edit" to add sets.
                </Text>
              )}
            </View>
          </View>
        </Animated.ScrollView>
      </View>

      {/* Plate Calculator Modal */}
      <PlateCalculatorModal
        visible={showPlateCalculator}
        onClose={() => {
          setShowPlateCalculator(false);
          setActiveSetId(null);
        }}
        onSelectWeight={handlePlateWeightSelect}
        initialWeight={
          activeSetId ? sets.find(s => s.id === activeSetId)?.weight : undefined
        }
      />
    </View>
  );
}
