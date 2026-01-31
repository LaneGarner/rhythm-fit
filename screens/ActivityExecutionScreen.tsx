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
import { useTimer } from '../context/TimerContext';
import { getActivityTypes } from '../services/activityTypeService';
import { updateActivity } from '../redux/activitySlice';
import { RootState } from '../redux/store';
import { useTheme } from '../theme/ThemeContext';
import { Activity, SetData, TrackingField } from '../types/activity';

export default function ActivityExecutionScreen({ navigation, route }: any) {
  const { activityId } = route.params;
  const dispatch = useDispatch();
  const { colorScheme, colors } = useTheme();
  const isDark = colorScheme === 'dark';

  const activities = useSelector((state: RootState) => state.activities.data);
  const activity = activities.find(a => a.id === activityId);

  // Global timer context (for checking if timer is running)
  const { timer } = useTimer();
  const isTimerRunning = timer.activityId === activityId && timer.isRunning;

  const [sets, setSets] = useState<SetData[]>(activity?.sets || []);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(activity?.completed || false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showPlateCalculator, setShowPlateCalculator] = useState(false);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);

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
    const fields = activity?.trackingFields || ['weight', 'reps'];
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

    // Auto-save progress when sets are updated
    if (activity) {
      const updatedActivity: Activity = {
        ...activity,
        sets: updatedSets,
      };
      dispatch(updateActivity(updatedActivity));

      // Check if all sets are now complete - auto-complete activity
      const allSetsComplete =
        updatedSets.length > 0 && updatedSets.every(s => s.completed);
      if (allSetsComplete && !activity.completed) {
        const completedActivity: Activity = {
          ...activity,
          completed: true,
          sets: updatedSets,
        };
        dispatch(updateActivity(completedActivity));
        Alert.alert('🎉 Nice Work!', 'All sets complete. Activity finished!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    }
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

  const handleCompleteActivity = () => {
    if (!activity) return;

    // Mark all sets as completed first for visual feedback
    const completedSets = sets.map(set => ({ ...set, completed: true }));
    setSets(completedSets);

    const updatedActivity: Activity = {
      ...activity,
      completed: true,
      sets: completedSets,
    };

    dispatch(updateActivity(updatedActivity));

    // Delay alert so user can see all sets turn green
    setTimeout(() => {
      Alert.alert('🎉 Nice Work!', 'Activity complete!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }, 300);
  };

  const handleSaveProgress = () => {
    if (!activity) return;

    const updatedActivity: Activity = {
      ...activity,
      sets: sets,
    };

    dispatch(updateActivity(updatedActivity));
    Alert.alert('Progress Saved', 'Your progress has been saved.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
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
          emoji={activity.emoji || '💪'}
          title={activity.name}
          subtitle={getActivityTypeLabel(activity.type)}
          scrollY={scrollY}
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
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {/* Large content header - fades out on scroll */}
          <ContentHeader
            emoji={activity.emoji || '💪'}
            title={activity.name}
            subtitle={getActivityTypeLabel(activity.type)}
            scrollY={scrollY}
          />

          <View className="p-4" style={{ gap: 24 }}>
            {/* Timer - Collapsible */}
            <CollapsibleTimer
              activityId={activity.id}
              activityName={activity.name}
              defaultExpanded={isTimerRunning}
            />

            {/* Notes */}
            <NotesCard notes={activity.notes || ''} />

            {/* Sets */}
            <View>
              <View className="flex-row justify-between items-center mb-4">
                <Text
                  className={`text-lg font-semibold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  Sets ({sets.length})
                </Text>
                <TouchableOpacity
                  onPress={handleAddSet}
                  hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  accessibilityRole="button"
                  accessibilityLabel="Add new set"
                >
                  <Text
                    style={{
                      color: colors.primary.main,
                      fontSize: 16,
                      fontWeight: '600',
                    }}
                  >
                    + Add Set
                  </Text>
                </TouchableOpacity>
              </View>

              {sets.map((set, index) => (
                <SetCard
                  key={set.id}
                  set={set}
                  index={index}
                  trackingFields={activity.trackingFields || ['weight', 'reps']}
                  activityType={activity.type}
                  onUpdateSet={handleUpdateSet}
                  onShowOptions={showSetOptions}
                  onOpenPlateCalculator={setId => {
                    setActiveSetId(setId);
                    setShowPlateCalculator(true);
                  }}
                  inputRefs={setInputRefs}
                  onInputFocus={scrollToSetInput}
                />
              ))}

              {sets.length === 0 && (
                <Text
                  className={`text-center py-8 ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  No sets added yet. Tap "Add Set" to get started.
                </Text>
              )}
            </View>
          </View>
        </Animated.ScrollView>
      </View>

      {/* Sticky Action Buttons */}
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
          onPress={handleCompleteActivity}
          className="bg-green-500 py-3 px-6 rounded-lg"
          accessibilityRole="button"
          accessibilityLabel="Complete activity"
        >
          <Text className="text-white text-center font-semibold text-lg">
            Complete Activity
          </Text>
        </TouchableOpacity>
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
