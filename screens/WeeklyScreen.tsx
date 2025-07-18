import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  deleteActivitiesForDate,
  updateActivity,
} from '../redux/activitySlice';
import { RootState } from '../redux/store';
import { ThemeContext } from '../theme/ThemeContext';
import { useWeekContext } from '../WeekContext';

export default function WeeklyScreen({ navigation }: any) {
  const activities = useSelector((state: RootState) => state.activities.data);
  const dispatch = useDispatch();
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';
  const { setWeekOffset: setContextWeekOffset } = useWeekContext();

  // State for tracking which week we're viewing (0 = current week, -1 = last week, 1 = next week, etc.)
  const [weekOffset, setWeekOffset] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const longPressInterval = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);
  const currentWeekOffsetRef = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const currentDayRef = useRef<View>(null);

  const getWeekDays = (offset: number = 0) => {
    const days = [];
    const today = dayjs();
    const targetDate = today.add(offset * 7, 'day');

    // Find the most recent Monday (or today if it's Monday)
    const monday =
      targetDate.day() === 1
        ? targetDate
        : targetDate.subtract(targetDate.day() - 1, 'day');

    for (let i = 0; i < 7; i++) {
      const date = monday.add(i, 'day');
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
    const today = dayjs();
    const targetDate = today.add(offset * 7, 'day');
    const monday =
      targetDate.day() === 1
        ? targetDate
        : targetDate.subtract(targetDate.day() - 1, 'day');
    const sunday = monday.add(6, 'day');

    // If both dates are in the same month
    if (monday.month() === sunday.month()) {
      return `${monday.format('MMMM')} ${monday.format('D')}-${sunday.format('D')}, ${monday.format('YYYY')}`;
    } else {
      // If dates span different months
      return `${monday.format('MMM D')}-${sunday.format('MMM D')}, ${monday.format('YYYY')}`;
    }
  };

  const getWeekLabel = (offset: number) => {
    if (offset === 0) return 'This Week';
    if (offset === -1) return 'Last Week';
    if (offset === 1) return 'Next Week';
    if (offset < 0) return `${Math.abs(offset)} Weeks Ago`;
    return `In ${offset} Week${offset > 1 ? 's' : ''}`;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newOffset =
      direction === 'prev'
        ? currentWeekOffsetRef.current - 1
        : currentWeekOffsetRef.current + 1;
    currentWeekOffsetRef.current = newOffset;
    setWeekOffset(newOffset);
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
            console.log('Failed to measure current day position');
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

  // Scroll to current day when component mounts or week changes
  useEffect(() => {
    const scrollToCurrentDay = () => {
      if (scrollViewRef.current && currentDayRef.current) {
        // Add a small delay to ensure the layout is complete
        setTimeout(() => {
          currentDayRef.current?.measureLayout(
            scrollViewRef.current as any,
            (x, y) => {
              scrollViewRef.current?.scrollTo({
                y: Math.max(0, y - 20), // Scroll to current day with some padding
                animated: true,
              });
            },
            () => {
              // Fallback if measureLayout fails
              console.log('Failed to measure current day position');
            }
          );
        }, 100);
      }
    };

    scrollToCurrentDay();
  }, [weekOffset]);

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
    return activities.filter(activity => activity.date === date);
  };

  const getWeekDates = (offset: number = 0) => {
    const days = getWeekDays(offset);
    return days.map(day => day.date);
  };

  const getWeekActivities = (offset: number = 0) => {
    const weekDates = getWeekDates(offset);
    return activities.filter(activity => weekDates.includes(activity.date));
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
      let clearIndex = -1;

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

      // Add "Clear" option if there are activities for this day
      if (dayActivities.length > 0) {
        options.push(`Clear ${activityCount} ${activityText}`);
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
          if (buttonIndex === markAllCompleteIndex) {
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
              'Clear Activities',
              `Are you sure you want to remove all ${activityCount} ${activityText} from ${formattedDate}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear',
                  style: 'destructive',
                  onPress: () => dispatch(deleteActivitiesForDate(date)),
                },
              ]
            );
          }
        }
      );
    } else {
      // Fallback for Android - use Alert with multiple options
      const alertOptions = [];

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
          text: `Clear ${activityCount} ${activityText}`,
          style: 'destructive' as const,
          onPress: () => {
            Alert.alert(
              'Clear Activities',
              `Are you sure you want to remove all ${activityCount} ${activityText} from ${formattedDate}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear',
                  style: 'destructive',
                  onPress: () => dispatch(deleteActivitiesForDate(date)),
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

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: isDark ? '#000' : '#F9FAFB' }}
    >
      <View
        className="pt-14 pb-4 px-4 border-b border-grey-200"
        style={{
          backgroundColor: isDark ? '#111' : '#fff',
          borderBottomColor: isDark ? '#222' : '#e5e7eb',
          marginTop: 2,
        }}
      >
        {/* Settings Button - left positioned */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          className="p-2"
          accessibilityLabel="Settings"
          style={{ position: 'absolute', left: 16, top: 69 }}
        >
          <Ionicons
            name="settings-outline"
            size={28}
            color={isDark ? '#e5e5e5' : '#64748b'}
          />
        </TouchableOpacity>

        {/* Centered week navigation container */}
        <View style={{ alignItems: 'center' }}>
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
                color={isScrolling ? '#6366f1' : isDark ? '#e5e5e5' : '#64748b'}
              />
            </TouchableOpacity>
            {/* Week label - centered in its container */}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <TouchableOpacity onPress={goToCurrentWeek} activeOpacity={0.7}>
                <Text
                  className="text-2xl font-bold"
                  style={{
                    color: isDark ? '#fff' : '#111',
                    textAlign: 'center',
                  }}
                >
                  {getWeekLabel(weekOffset)}
                </Text>
              </TouchableOpacity>
            </View>
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
                color={isScrolling ? '#6366f1' : isDark ? '#e5e5e5' : '#64748b'}
              />
            </TouchableOpacity>
          </View>
          {/* Bottom container: dates centered */}
          <View style={{ width: 240, alignItems: 'center' }}>
            <Text
              style={{
                color: isDark ? '#e5e5e5' : '#666',
                textAlign: 'center',
                fontSize: 14,
                lineHeight: 18,
                marginTop: 4,
              }}
            >
              {getWeekDateRange(weekOffset)}
            </Text>
          </View>
        </View>
      </View>
      <ScrollView ref={scrollViewRef} className="flex-1 px-4 pt-4 pb-20">
        {weekDays.map(day => {
          const dayActivities = getActivitiesForDate(day.date);
          return (
            <TouchableOpacity
              key={day.date}
              ref={day.isToday ? currentDayRef : undefined}
              className={`mb-4 p-4 rounded-xl shadow-sm`}
              style={{
                backgroundColor: day.isToday
                  ? isDark
                    ? '#23263a'
                    : '#e0e7ff'
                  : isDark
                    ? '#18181b'
                    : '#f3f4f6',
                borderColor: day.isToday
                  ? isDark
                    ? '#6366f1'
                    : '#a5b4fc'
                  : 'transparent',
                borderWidth: day.isToday ? 2 : 0,
              }}
              onPress={() => navigation.navigate('Day', { date: day.date })}
              onLongPress={() =>
                handleDayLongPress(day.date, day.dayName, day.dayNumber)
              }
              delayLongPress={500}
              activeOpacity={0.7}
            >
              <View className="flex-row justify-between items-center mb-2">
                <View>
                  <Text
                    className="text-sm font-medium"
                    style={{
                      color: day.isToday
                        ? isDark
                          ? '#818cf8'
                          : '#2563eb'
                        : isDark
                          ? '#a3a3a3'
                          : '#6b7280',
                    }}
                  >
                    {day.dayName}
                  </Text>
                  <Text
                    className="text-xl font-bold"
                    style={{
                      color: day.isToday
                        ? isDark
                          ? '#fff'
                          : '#1e3a8a'
                        : isDark
                          ? '#fff'
                          : '#111',
                    }}
                  >
                    {day.dayNumber}
                  </Text>
                </View>

                <View className="flex-row flex-wrap justify-end">
                  {dayActivities.slice(0, 10).map((activity, index) => (
                    <Text key={activity.id} className="text-lg ml-1 mb-1">
                      {activity.emoji || '💪'}
                    </Text>
                  ))}
                  {dayActivities.length > 10 && (
                    <Text
                      style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
                      className="ml-1 text-sm"
                    >
                      +{dayActivities.length - 10}
                    </Text>
                  )}
                </View>
              </View>

              {dayActivities.length === 0 && (
                <Text
                  style={{ color: isDark ? '#a3a3a3' : '#9ca3af' }}
                  className="text-sm"
                >
                  No activities planned
                </Text>
              )}

              {dayActivities.length > 0 && (
                <View>
                  {dayActivities.map(activity => (
                    <View
                      key={activity.id}
                      className="flex-row items-center mt-1"
                    >
                      <Text className="text-lg mr-2">
                        {activity.emoji || '💪'}
                      </Text>
                      <Text
                        style={{ color: isDark ? '#e5e5e5' : '#374151' }}
                        className="flex-1"
                      >
                        {activity.name || activity.type}
                      </Text>
                      <View
                        className={`w-3 h-3 rounded-full ${activity.completed ? 'bg-green-500' : 'bg-gray-300'}`}
                      />
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        onPress={() =>
          navigation.navigate('Activity', {
            date: dayjs().format('YYYY-MM-DD'),
          })
        }
        style={{
          position: 'absolute',
          bottom: 102,
          right: 34,
          backgroundColor: '#2563eb',
          borderRadius: 32,
          width: 56,
          height: 56,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 5,
        }}
        activeOpacity={0.85}
        accessibilityLabel="Add Activity"
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
