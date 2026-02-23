import dayjs from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import CollapsibleTimer from '../components/CollapsibleTimer';
import HeaderButton from '../components/HeaderButton';
import NotesCard from '../components/NotesCard';
import SetCard from '../components/SetCard';
import {
  ContentHeader,
  StickyCompactHeader,
} from '../components/StickyActivityHeader';
import { useTutorial } from '../components/tutorial/TutorialProvider';
import { useTheme } from '../theme/ThemeContext';
import { Activity, SetData } from '../types/activity';

const DEMO_ACTIVITY: Activity = {
  id: 'demo-activity',
  date: dayjs().format('YYYY-MM-DD'),
  type: 'weight-training',
  name: 'Bench Press',
  emoji: '🏋️',
  completed: false,
  trackingFields: ['weight', 'reps'],
  sets: [
    { id: 'demo-set-1', weight: 135, reps: 10, completed: true },
    { id: 'demo-set-2', weight: 155, reps: 8, completed: true },
    { id: 'demo-set-3', weight: 175, reps: 6, completed: false },
  ],
};

export default function DemoActivityExecutionScreen({ navigation }: any) {
  const { colorScheme, colors } = useTheme();
  const isDark = colorScheme === 'dark';
  const { isActive, currentStep } = useTutorial();

  const [sets, setSets] = useState<SetData[]>(DEMO_ACTIVITY.sets || []);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<Animated.ScrollView>(null);

  // Auto-scroll during tutorial to showcase the sets section
  useEffect(() => {
    if (isActive && currentStep?.id === 'activity-execution') {
      let cancelled = false;
      const targetY = 350;
      const duration = 2500; // 2.5 seconds for slow scroll

      const scrollTimer = setTimeout(() => {
        if (cancelled) return;

        const startTime = Date.now();
        const animate = () => {
          if (cancelled) return;

          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Ease-in-out for smooth feel
          const eased =
            progress < 0.5
              ? 2 * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 2) / 2;

          scrollViewRef.current?.scrollTo({
            y: eased * targetY,
            animated: false,
          });

          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        requestAnimationFrame(animate);
      }, 1000);

      return () => {
        cancelled = true;
        clearTimeout(scrollTimer);
      };
    }
  }, [isActive, currentStep]);

  const handleUpdateSet = (setId: string, updates: Partial<SetData>) => {
    setSets(prev =>
      prev.map(set => (set.id === setId ? { ...set, ...updates } : set))
    );
  };

  const handleShowOptions = () => {
    // No-op in demo mode - just show the options menu exists
  };

  const handleDone = () => {
    navigation.goBack();
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background }}
      testID="demo-activity-content"
    >
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
            Demo Activity
          </Text>
        </View>
        <HeaderButton label="Edit" onPress={() => {}} />
      </View>

      {/* Content area wrapper for sticky header positioning */}
      <View style={{ flex: 1, position: 'relative' }}>
        {/* Sticky compact header - positioned at top of content area */}
        <StickyCompactHeader
          emoji={DEMO_ACTIVITY.emoji || '💪'}
          title={DEMO_ACTIVITY.name}
          subtitle="Weight Training"
          scrollY={scrollY}
        />

        <Animated.ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 200 }}
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
            emoji={DEMO_ACTIVITY.emoji || '💪'}
            title={DEMO_ACTIVITY.name}
            subtitle="Weight Training"
            scrollY={scrollY}
          />

          <View className="p-4" style={{ gap: 24 }}>
            {/* Timer - Collapsible (demo mode - won't actually track) */}
            <CollapsibleTimer
              activityId={DEMO_ACTIVITY.id}
              activityName={DEMO_ACTIVITY.name}
              defaultExpanded={false}
            />

            {/* Notes */}
            <NotesCard notes="Demo activity for tutorial. Try tapping 'Mark Complete' on a set!" />

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
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 14,
                  }}
                >
                  Demo Mode
                </Text>
              </View>

              {sets.map((set, index) => (
                <SetCard
                  key={set.id}
                  set={set}
                  index={index}
                  trackingFields={
                    DEMO_ACTIVITY.trackingFields || ['weight', 'reps']
                  }
                  activityType={DEMO_ACTIVITY.type}
                  onUpdateSet={handleUpdateSet}
                  onShowOptions={handleShowOptions}
                />
              ))}
            </View>
          </View>
        </Animated.ScrollView>
      </View>

      {/* Sticky Action Button */}
      <View
        className={`absolute left-0 right-0 p-4 border-t ${
          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}
        style={{
          bottom: 0,
          paddingBottom: 34,
          zIndex: 1000,
        }}
      >
        <TouchableOpacity
          onPress={handleDone}
          className="bg-green-500 py-3 px-6 rounded-lg"
          accessibilityRole="button"
          accessibilityLabel="Done with demo"
        >
          <Text className="text-white text-center font-semibold text-lg">
            Done
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
