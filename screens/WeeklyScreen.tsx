import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useWeekBoundaries } from '../hooks/useWeekBoundaries';
import FloatingAddButton from '../components/FloatingAddButton';
import ProgressBar from '../components/ProgressBar';
import { useTutorial } from '../components/tutorial';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  addActivity,
  deleteActivitiesForDate,
  updateActivity,
} from '../redux/activitySlice';
import { RootState } from '../redux/store';
import { useAuth } from '../context/AuthContext';
import { pushActivityChange } from '../services/syncService';
import { useTheme } from '../theme/ThemeContext';
import { useWeekContext } from '../WeekContext';
import {
  groupActivitiesWithSupersets,
  getSupersetEmojis,
  isSupersetComplete,
  ActivityGroup,
} from '../utils/supersetUtils';

export default function WeeklyScreen({ navigation }: any) {
  const activities = useSelector((state: RootState) => state.activities.data);
  const dispatch = useDispatch();
  const { colorScheme, colors } = useTheme();
  const isDark = colorScheme === 'dark';
  const { setWeekOffset: setContextWeekOffset } = useWeekContext();
  const { getAccessToken } = useAuth();
  const { getWeekStartByOffset, firstDayOfWeek } = useWeekBoundaries();
  const {
    registerTarget,
    unregisterTarget,
    isActive: tutorialActive,
    currentStep,
  } = useTutorial();

  // Refs for tutorial targets
  const weekHeaderRef = useRef<View>(null);
  const addButtonRef = useRef<View>(null);
  const settingsButtonRef = useRef<View>(null);

  // State for tracking which week we're viewing (0 = current week, -1 = last week, 1 = next week, etc.)
  const [weekOffset, setWeekOffset] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const longPressInterval = useRef<NodeJS.Timeout | null>(null);

  // State for copy to date modal
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceDate, setCopySourceDate] = useState<string | null>(null);
  const [copyTargetDate, setCopyTargetDate] = useState(new Date());
  const [isCopying, setIsCopying] = useState(false);
  const isScrollingRef = useRef(false);
  const currentWeekOffsetRef = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const currentDayRef = useRef<View>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;

  const getWeekDays = (offset: number = 0) => {
    const days = [];
    const today = dayjs();
    const weekStart = getWeekStartByOffset(offset);

    for (let i = 0; i < 7; i++) {
      const date = weekStart.add(i, 'day');
      days.push({
        date: date.format('YYYY-MM-DD'),
        dayName: date.format('ddd'),
        dayNumber: date.format('D'),
        isToday: date.isSame(today, 'day'),
      });
    }
    return days;
  };

  const getWeekDateRange = (offset: number = 0) => {
    const weekStart = getWeekStartByOffset(offset);
    const weekEnd = weekStart.add(6, 'day');

    // If both dates are in the same month
    if (weekStart.month() === weekEnd.month()) {
      return `${weekStart.format('MMMM')} ${weekStart.format('D')}-${weekEnd.format('D')}, ${weekStart.format('YYYY')}`;
    } else {
      // If dates span different months
      return `${weekStart.format('MMM D')}-${weekEnd.format('MMM D')}, ${weekStart.format('YYYY')}`;
    }
  };

  const getWeekLabel = (offset: number) => {
    if (offset === 0) return 'This Week';
    if (offset === -1) return 'Last Week';
    if (offset === 1) return 'Next Week';
    if (offset < 0) return `${Math.abs(offset)} Weeks Ago`;
    return `In ${offset} Week${offset > 1 ? 's' : ''}`;
  };

  const navigateWeek = (direction: 'prev' | 'next', animated = false) => {
    const newOffset =
      direction === 'prev'
        ? currentWeekOffsetRef.current - 1
        : currentWeekOffsetRef.current + 1;

    if (animated) {
      // Slide out in the direction of navigation (use full screen width to ensure content exits view)
      const slideDistance = screenWidth * 1.2;
      const slideOutTo = direction === 'next' ? -slideDistance : slideDistance;
      Animated.timing(slideAnim, {
        toValue: slideOutTo,
        duration: 65,
        useNativeDriver: true,
      }).start(() => {
        // Scroll to top while content is off-screen (unless going to current week)
        if (newOffset !== 0 && scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: 0, animated: false });
        }
        // Update the week
        currentWeekOffsetRef.current = newOffset;
        setWeekOffset(newOffset);
        // Position for slide in from opposite side
        slideAnim.setValue(
          direction === 'next' ? slideDistance : -slideDistance
        );
        // Slide in
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 65,
          useNativeDriver: true,
        }).start();
      });
    } else {
      // Scroll to top for non-current weeks (arrow button navigation)
      if (newOffset !== 0 && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }
      currentWeekOffsetRef.current = newOffset;
      setWeekOffset(newOffset);
    }
  };

  const goToCurrentWeek = () => {
    currentWeekOffsetRef.current = 0;
    setWeekOffset(0);

    // Scroll to current day after a brief delay to ensure the week has updated
    setTimeout(() => {
      if (scrollViewRef.current && currentDayRef.current) {
        currentDayRef.current?.measureLayout(
          scrollViewRef.current as any,
          (x, y) => {
            scrollViewRef.current?.scrollTo({
              y: Math.max(0, y - 20),
              animated: true,
            });
          },
          () => {
            // Failed to measure current day position
          }
        );
      }
    }, 150);
  };

  // Update the ref when weekOffset changes
  React.useEffect(() => {
    currentWeekOffsetRef.current = weekOffset;
  }, [weekOffset]);

  // Update context when weekOffset changes so DevModeButton knows which week is in view
  useEffect(() => {
    setContextWeekOffset(weekOffset);
  }, [weekOffset, setContextWeekOffset]);

  // Scroll behavior when week changes
  useEffect(() => {
    if (weekOffset === 0) {
      // Current week: scroll to today (needs brief delay for measureLayout)
      setTimeout(() => {
        if (scrollViewRef.current && currentDayRef.current) {
          currentDayRef.current?.measureLayout(
            scrollViewRef.current as any,
            (x, y) => {
              scrollViewRef.current?.scrollTo({
                y: Math.max(0, y - 20),
                animated: true,
              });
            },
            () => {
              // Fallback if measureLayout fails
            }
          );
        }
      }, 50);
    }
  }, [weekOffset]);

  // Go to current week when Activities tab is pressed while already on this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      goToCurrentWeek();
    });
    return unsubscribe;
  }, [navigation]);

  // Tutorial target registration
  const registerWeekHeader = useCallback(() => {
    if (weekHeaderRef.current) {
      weekHeaderRef.current.measure((x, y, width, height, pageX, pageY) => {
        registerTarget('week-header', { x, y, width, height, pageX, pageY });
      });
    }
  }, [registerTarget]);

  const registerAddButton = useCallback(() => {
    if (addButtonRef.current) {
      addButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
        registerTarget('floating-add-button', {
          x,
          y,
          width,
          height,
          pageX,
          pageY,
        });
      });
    }
  }, [registerTarget]);

  const registerTodayCard = useCallback(() => {
    if (currentDayRef.current) {
      currentDayRef.current.measure((x, y, width, height, pageX, pageY) => {
        registerTarget('today-card', { x, y, width, height, pageX, pageY });
      });
    }
  }, [registerTarget]);

  const registerSettingsButton = useCallback(() => {
    if (settingsButtonRef.current) {
      settingsButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
        registerTarget('settings-button', {
          x,
          y,
          width,
          height,
          pageX,
          pageY,
        });
      });
    }
  }, [registerTarget]);

  // Register targets when tutorial becomes active
  useEffect(() => {
    if (tutorialActive) {
      const timer = setTimeout(() => {
        registerWeekHeader();
        registerAddButton();
        registerTodayCard();
        registerSettingsButton();
      }, 100);
      return () => clearTimeout(timer);
    }
    return () => {
      unregisterTarget('week-header');
      unregisterTarget('floating-add-button');
      unregisterTarget('today-card');
      unregisterTarget('settings-button');
    };
  }, [
    tutorialActive,
    registerWeekHeader,
    registerAddButton,
    registerTodayCard,
    registerSettingsButton,
    unregisterTarget,
  ]);

  // Scroll to today and re-measure when day-view step is active
  useEffect(() => {
    if (
      currentStep?.id === 'day-view' &&
      currentDayRef.current &&
      scrollViewRef.current
    ) {
      // Scroll to today's card first
      currentDayRef.current.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, y - 20),
            animated: false,
          });
          // Re-measure after scroll completes
          setTimeout(registerTodayCard, 150);
        },
        () => {}
      );
    }
  }, [currentStep, registerTodayCard]);

  // Re-register tutorial targets after week navigation
  useEffect(() => {
    if (tutorialActive) {
      const timer = setTimeout(() => {
        registerWeekHeader();
        registerTodayCard();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [weekOffset, tutorialActive, registerWeekHeader, registerTodayCard]);

  const handleSinglePress = (direction: 'prev' | 'next') => {
    navigateWeek(direction);
  };

  const handleLongPress = (direction: 'prev' | 'next') => {
    isScrollingRef.current = true;
    setIsScrolling(true);

    let currentDelay = 500; // Start faster (was 800)
    const minDelay = 100;

    const scrollWithSpeed = () => {
      if (!isScrollingRef.current) {
        return;
      }

      navigateWeek(direction);
      currentDelay = Math.max(minDelay, currentDelay - 75); // Speed up faster (was 50)

      longPressInterval.current = setTimeout(scrollWithSpeed, currentDelay);
    };

    scrollWithSpeed();
  };

  const stopScrolling = () => {
    isScrollingRef.current = false;
    setIsScrolling(false);
    if (longPressInterval.current) {
      clearTimeout(longPressInterval.current);
      longPressInterval.current = null;
    }
  };

  const getActivitiesForDate = (date: string) => {
    return activities
      .filter(activity => activity.date === date)
      .sort((a, b) => {
        // Primary: Use custom order if available
        const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        // Secondary: By ID (timestamp-based, older first)
        return a.id.localeCompare(b.id);
      });
  };

  const getWeekDates = (offset: number = 0) => {
    const days = getWeekDays(offset);
    return days.map(day => day.date);
  };

  const getWeekActivities = (offset: number = 0) => {
    const weekDates = getWeekDates(offset);
    return activities.filter(activity => weekDates.includes(activity.date));
  };

  const handleClearActivitiesForDate = async (date: string) => {
    const activitiesToDelete = activities.filter(a => a.date === date);
    dispatch(deleteActivitiesForDate(date));
    // Sync deletions to backend
    try {
      const token = await getAccessToken();
      if (token) {
        for (const activity of activitiesToDelete) {
          await pushActivityChange(token, activity, true);
        }
      }
    } catch (err) {
      console.error('Failed to sync deletions:', err);
    }
  };

  const handleCopyToDate = (sourceDate: string) => {
    setCopySourceDate(sourceDate);
    // Default to the same date (user will pick the target)
    setCopyTargetDate(dayjs(sourceDate).toDate());
    setShowCopyModal(true);
  };

  const confirmCopyToDate = async () => {
    if (!copySourceDate || isCopying) return;

    setIsCopying(true);

    const sourceActivities = getActivitiesForDate(copySourceDate);
    const targetDateStr = dayjs(copyTargetDate).format('YYYY-MM-DD');
    const targetDateFormatted = dayjs(copyTargetDate).format('dddd, MMMM D');

    // Generate new superset IDs for copied supersets
    const supersetIdMap = new Map<string, string>();

    // Copy each activity with a new ID and mark as incomplete
    for (let i = 0; i < sourceActivities.length; i++) {
      const activity = sourceActivities[i];

      // Generate new superset ID if this activity is in a superset
      let newSupersetId = undefined;
      if (activity.supersetId) {
        if (!supersetIdMap.has(activity.supersetId)) {
          supersetIdMap.set(
            activity.supersetId,
            `superset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          );
        }
        newSupersetId = supersetIdMap.get(activity.supersetId);
      }

      const newActivity = {
        ...activity,
        id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        date: targetDateStr,
        completed: false,
        supersetId: newSupersetId,
        // Reset sets to incomplete if they exist
        sets: activity.sets?.map(set => ({ ...set, completed: false })),
      };

      dispatch(addActivity(newActivity));

      // Sync to backend
      try {
        const token = await getAccessToken();
        if (token) {
          await pushActivityChange(token, newActivity);
        }
      } catch (err) {
        console.error('Failed to sync copied activity:', err);
      }
    }

    setIsCopying(false);
    setShowCopyModal(false);
    setCopySourceDate(null);

    // Show confirmation
    Alert.alert(
      'Copied',
      `${sourceActivities.length} activit${sourceActivities.length === 1 ? 'y' : 'ies'} copied to ${targetDateFormatted}`
    );
  };

  const handleDayLongPress = (
    date: string,
    dayName: string,
    dayNumber: string
  ) => {
    const dayActivities = getActivitiesForDate(date);

    const formattedDate = dayjs(date).format('dddd, MMMM D');
    const activityCount = dayActivities.length;
    const activityText = activityCount === 1 ? 'activity' : 'activities';

    // Count incomplete and complete activities for this specific day
    const incompleteActivities = dayActivities.filter(
      activity => !activity.completed
    );
    const completeActivities = dayActivities.filter(
      activity => activity.completed
    );

    if (Platform.OS === 'ios') {
      const options = ['Cancel'];
      const cancelButtonIndex = 0;
      let destructiveButtonIndex = -1;
      let markAllCompleteIndex = -1;
      let markAllIncompleteIndex = -1;
      let copyToDateIndex = -1;
      let clearIndex = -1;

      // Add "Copy to Date" option if there are activities for this day
      if (dayActivities.length > 0) {
        options.push(`Copy ${activityCount} ${activityText} to...`);
        copyToDateIndex = options.length - 1;
      }

      // Add "Mark All Complete" option if there are incomplete activities
      if (incompleteActivities.length > 0) {
        options.push(`Mark All Complete (${incompleteActivities.length})`);
        markAllCompleteIndex = options.length - 1;
      }

      // Add "Mark All Incomplete" option if there are complete activities
      if (completeActivities.length > 0) {
        options.push(`Mark All Incomplete (${completeActivities.length})`);
        markAllIncompleteIndex = options.length - 1;
      }

      // Add "Delete" option if there are activities for this day
      if (dayActivities.length > 0) {
        options.push(`Delete ${activityCount} ${activityText}`);
        clearIndex = options.length - 1;
        destructiveButtonIndex = clearIndex;
      }

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex:
            destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
          userInterfaceStyle: isDark ? 'dark' : 'light',
        },
        buttonIndex => {
          if (buttonIndex === copyToDateIndex) {
            handleCopyToDate(date);
          } else if (buttonIndex === markAllCompleteIndex) {
            Alert.alert(
              'Mark All Complete',
              `Mark all ${incompleteActivities.length} incomplete activity${incompleteActivities.length > 1 ? 's' : ''} as complete?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Mark Complete',
                  style: 'default',
                  onPress: () => {
                    incompleteActivities.forEach(activity => {
                      dispatch(
                        updateActivity({ ...activity, completed: true })
                      );
                    });
                  },
                },
              ]
            );
          } else if (buttonIndex === markAllIncompleteIndex) {
            Alert.alert(
              'Mark All Incomplete',
              `Mark all ${completeActivities.length} complete activity${completeActivities.length > 1 ? 's' : ''} as incomplete?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Mark Incomplete',
                  style: 'destructive',
                  onPress: () => {
                    completeActivities.forEach(activity => {
                      dispatch(
                        updateActivity({ ...activity, completed: false })
                      );
                    });
                  },
                },
              ]
            );
          } else if (buttonIndex === clearIndex) {
            Alert.alert(
              'Delete Activities',
              `Are you sure you want to delete all ${activityCount} ${activityText} from ${formattedDate}? This cannot be undone.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => handleClearActivitiesForDate(date),
                },
              ]
            );
          }
        }
      );
    } else {
      // Fallback for Android - use Alert with multiple options
      const alertOptions = [];

      if (dayActivities.length > 0) {
        alertOptions.push({
          text: `Copy ${activityCount} ${activityText} to...`,
          onPress: () => handleCopyToDate(date),
        });
      }

      if (incompleteActivities.length > 0) {
        alertOptions.push({
          text: `Mark All Complete (${incompleteActivities.length})`,
          onPress: () => {
            Alert.alert(
              'Mark All Complete',
              `Mark all ${incompleteActivities.length} incomplete activity${incompleteActivities.length > 1 ? 's' : ''} as complete?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Mark Complete',
                  style: 'default',
                  onPress: () => {
                    incompleteActivities.forEach(activity => {
                      dispatch(
                        updateActivity({ ...activity, completed: true })
                      );
                    });
                  },
                },
              ]
            );
          },
        });
      }

      if (completeActivities.length > 0) {
        alertOptions.push({
          text: `Mark All Incomplete (${completeActivities.length})`,
          onPress: () => {
            Alert.alert(
              'Mark All Incomplete',
              `Mark all ${completeActivities.length} complete activity${completeActivities.length > 1 ? 's' : ''} as incomplete?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Mark Incomplete',
                  style: 'destructive',
                  onPress: () => {
                    completeActivities.forEach(activity => {
                      dispatch(
                        updateActivity({ ...activity, completed: false })
                      );
                    });
                  },
                },
              ]
            );
          },
        });
      }

      if (dayActivities.length > 0) {
        alertOptions.push({
          text: `Delete ${activityCount} ${activityText}`,
          style: 'destructive' as const,
          onPress: () => {
            Alert.alert(
              'Delete Activities',
              `Are you sure you want to delete all ${activityCount} ${activityText} from ${formattedDate}? This cannot be undone.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => handleClearActivitiesForDate(date),
                },
              ]
            );
          },
        });
      }

      if (alertOptions.length === 0) {
        Alert.alert('No Actions', 'No actions available for this day.', [
          { text: 'OK', style: 'default' },
        ]);
        return;
      }

      Alert.alert(formattedDate, 'Choose an action:', [
        { text: 'Cancel', style: 'cancel' },
        ...alertOptions,
      ]);
    }
  };

  const weekDays = getWeekDays(weekOffset);

  // Swipe gesture for week navigation
  const swipeGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-20, 20]) // Only activate for horizontal movement
    .onUpdate(event => {
      // Track finger movement for visual feedback (capped at 100px)
      const clampedX = Math.max(-100, Math.min(100, event.translationX));
      slideAnim.setValue(clampedX);
    })
    .onEnd(event => {
      const threshold = 50;
      if (
        event.translationX < -threshold &&
        Math.abs(event.translationX) > Math.abs(event.translationY)
      ) {
        // Swipe left → next week
        navigateWeek('next', true);
      } else if (
        event.translationX > threshold &&
        Math.abs(event.translationX) > Math.abs(event.translationY)
      ) {
        // Swipe right → previous week
        navigateWeek('prev', true);
      } else {
        // Snap back if threshold not met
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    });

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View
        className="pt-14 pb-4 px-4 border-b border-grey-200"
        style={{
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          marginTop: 2,
        }}
      >
        {/* Settings Button - right positioned */}
        <TouchableOpacity
          ref={settingsButtonRef}
          nativeID="settings-button"
          onPress={() => navigation.navigate('Settings')}
          className="p-2"
          accessibilityLabel="Settings"
          style={{ position: 'absolute', right: 16, top: 62 }}
        >
          <Ionicons
            name="person-circle-outline"
            size={28}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Centered week navigation container */}
        <View
          ref={weekHeaderRef}
          onLayout={registerWeekHeader}
          style={{ alignItems: 'center' }}
        >
          {/* Top container: carets + week label with space-between */}
          <View
            style={{
              width: 240,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {/* Left caret */}
            <TouchableOpacity
              onPress={() => handleSinglePress('prev')}
              onPressOut={stopScrolling}
              onLongPress={() => handleLongPress('prev')}
              className="p-2"
              accessibilityLabel="Previous week"
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              delayLongPress={800}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={
                  isScrolling ? colors.secondary.main : colors.textSecondary
                }
              />
            </TouchableOpacity>
            {/* Week label + date range - combined touchable area */}
            <TouchableOpacity
              onPress={goToCurrentWeek}
              activeOpacity={0.7}
              style={{ flex: 1, alignItems: 'center' }}
            >
              <Text
                className="text-2xl font-bold"
                style={{
                  color: colors.text,
                  textAlign: 'center',
                }}
              >
                {getWeekLabel(weekOffset)}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  textAlign: 'center',
                  fontSize: 14,
                  lineHeight: 18,
                  marginTop: 4,
                }}
              >
                {getWeekDateRange(weekOffset)}
              </Text>
            </TouchableOpacity>
            {/* Right caret */}
            <TouchableOpacity
              onPress={() => handleSinglePress('next')}
              onPressOut={stopScrolling}
              onLongPress={() => handleLongPress('next')}
              className="p-2"
              accessibilityLabel="Next week"
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              delayLongPress={800}
            >
              <Ionicons
                name="chevron-forward"
                size={24}
                color={
                  isScrolling ? colors.secondary.main : colors.textSecondary
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <GestureDetector gesture={swipeGesture}>
        <Animated.View
          style={{ flex: 1, transform: [{ translateX: slideAnim }] }}
        >
          <ScrollView
            ref={scrollViewRef}
            className="flex-1 px-4 pt-4"
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {weekDays.map((day, index) => {
              const dayActivities = getActivitiesForDate(day.date);
              const allCompleted =
                dayActivities.length > 0 &&
                dayActivities.every(a => a.completed);
              const completedCount = dayActivities.filter(
                a => a.completed
              ).length;
              return (
                <TouchableOpacity
                  key={day.date}
                  ref={day.isToday ? currentDayRef : undefined}
                  onLayout={day.isToday ? registerTodayCard : undefined}
                  className={`mb-4 p-4 rounded-xl shadow-sm`}
                  style={{
                    backgroundColor: day.isToday
                      ? colors.accent.background
                      : colors.cardBackground,
                    borderColor: day.isToday
                      ? colors.accent.main
                      : 'transparent',
                    borderWidth: day.isToday ? 2 : 0,
                  }}
                  onPress={() => navigation.navigate('Day', { date: day.date })}
                  onLongPress={() =>
                    handleDayLongPress(day.date, day.dayName, day.dayNumber)
                  }
                  delayLongPress={500}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${day.dayName} ${day.dayNumber}${day.isToday ? ', today' : ''}, ${dayActivities.length === 0 ? 'no activities' : `${completedCount} of ${dayActivities.length} activities completed`}`}
                  accessibilityHint="Tap to view day, hold for options"
                >
                  <View className="mb-2">
                    <Text
                      className="text-sm font-medium"
                      style={{
                        color: day.isToday
                          ? colors.accent.main
                          : colors.textSecondary,
                      }}
                    >
                      {day.dayName}
                    </Text>
                    <Text
                      className="text-xl font-bold"
                      style={{ color: colors.text }}
                    >
                      {day.dayNumber}
                    </Text>
                  </View>

                  {dayActivities.length === 0 && (
                    <Text
                      style={{ color: colors.textTertiary }}
                      className="text-sm"
                    >
                      No activities planned
                    </Text>
                  )}

                  {dayActivities.length > 0 && (
                    <View>
                      {groupActivitiesWithSupersets(dayActivities).map(
                        (group: ActivityGroup) => {
                          if (group.type === 'superset') {
                            // Render superset as combined row
                            const supersetComplete = isSupersetComplete(
                              group.activities
                            );
                            return (
                              <View
                                key={group.supersetId}
                                className="flex-row items-center mt-1"
                              >
                                <Text
                                  style={{
                                    color: colors.text,
                                  }}
                                  className="flex-1"
                                  numberOfLines={1}
                                >
                                  {getSupersetEmojis(group.activities)}
                                </Text>
                                {supersetComplete ? (
                                  <Ionicons
                                    name="checkmark-circle"
                                    size={18}
                                    color={colors.success.main}
                                  />
                                ) : (
                                  <Ionicons
                                    name="ellipse-outline"
                                    size={18}
                                    color={colors.border}
                                  />
                                )}
                              </View>
                            );
                          }
                          // Render single activity
                          const activity = group.activities[0];
                          return (
                            <View
                              key={activity.id}
                              className="flex-row items-center mt-1"
                            >
                              <Text className="text-lg mr-2">
                                {activity.emoji || '💪'}
                              </Text>
                              <Text
                                style={{
                                  color: colors.text,
                                }}
                                className="flex-1"
                              >
                                {activity.name || activity.type}
                              </Text>
                              {activity.completed ? (
                                <Ionicons
                                  name="checkmark-circle"
                                  size={18}
                                  color={colors.success.main}
                                />
                              ) : (
                                <Ionicons
                                  name="ellipse-outline"
                                  size={18}
                                  color={colors.border}
                                />
                              )}
                            </View>
                          );
                        }
                      )}
                    </View>
                  )}

                  {dayActivities.length > 0 && (
                    <View style={{ marginTop: 14 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginBottom: 4,
                        }}
                      >
                        {allCompleted && (
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color={colors.success.main}
                            style={{ marginRight: 4 }}
                          />
                        )}
                        <Text
                          style={{
                            color: colors.textSecondary,
                            fontSize: 12,
                          }}
                        >
                          {dayActivities.filter(a => a.completed).length}/
                          {dayActivities.length} complete
                        </Text>
                      </View>
                      <ProgressBar
                        completed={
                          dayActivities.filter(a => a.completed).length
                        }
                        total={dayActivities.length}
                        isDark={isDark}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </GestureDetector>

      <FloatingAddButton
        ref={addButtonRef}
        onLayout={registerAddButton}
        onPress={() =>
          navigation.navigate('Activity', {
            date: dayjs().format('YYYY-MM-DD'),
          })
        }
        accessibilityLabel="Add Activity"
      />

      {/* Copy to Date Modal */}
      <Modal
        visible={showCopyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCopyModal(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <View
            style={{
              backgroundColor: colors.modalBackground,
              borderRadius: 16,
              padding: 20,
              width: '85%',
              maxWidth: 340,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: colors.text,
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Copy Activities
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: 'center',
                marginBottom: 16,
              }}
            >
              {copySourceDate &&
                `From ${dayjs(copySourceDate).format('dddd, MMMM D')}`}
            </Text>

            {/* Target date display */}
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                marginBottom: 8,
              }}
            >
              Copy to:
            </Text>
            <View
              style={{
                backgroundColor: colors.surfaceSecondary,
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: colors.text,
                  textAlign: 'center',
                }}
              >
                {dayjs(copyTargetDate).format('dddd, MMMM D, YYYY')}
              </Text>
            </View>

            {/* Date Picker */}
            <View
              style={{
                backgroundColor: colors.surfaceSecondary,
                borderRadius: 12,
                marginBottom: 20,
                overflow: 'hidden',
              }}
            >
              <DateTimePicker
                value={copyTargetDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setCopyTargetDate(selectedDate);
                  }
                }}
                textColor={colors.text}
                themeVariant={isDark ? 'dark' : 'light'}
                style={{ height: 150 }}
              />
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowCopyModal(false)}
                disabled={isCopying}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: colors.backgroundTertiary,
                  opacity: isCopying ? 0.5 : 1,
                }}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    fontWeight: '600',
                    color: colors.text,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmCopyToDate}
                disabled={isCopying}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: colors.primary.main,
                  opacity: isCopying ? 0.8 : 1,
                }}
              >
                {isCopying ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    style={{
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#fff',
                    }}
                  >
                    Copy
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
