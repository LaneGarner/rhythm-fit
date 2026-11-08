import dayjs from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import WorkoutExecutionLayout from '../components/WorkoutExecutionLayout';
import WorkoutExecutionSets from '../components/WorkoutExecutionSets';
import { useTutorial } from '../components/tutorial/TutorialProvider';
import { useTheme } from '../theme/ThemeContext';
import { Activity, SetData } from '../types/activity';

const DEMO_ACTIVITY: Activity = {
  id: 'demo-activity',
  date: dayjs().format('YYYY-MM-DD'),
  type: 'weight-training',
  name: 'Bench Press',
  completed: false,
  trackingFields: ['weight', 'reps'],
  sets: [
    { id: 'demo-set-1', weight: 135, reps: 10, completed: true },
    { id: 'demo-set-2', weight: 155, reps: 8, completed: true },
    { id: 'demo-set-3', weight: 175, reps: 6, completed: false },
  ],
};

export default function DemoActivityExecutionScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isActive, currentStep } = useTutorial();
  const [sets, setSets] = useState<SetData[]>(DEMO_ACTIVITY.sets || []);
  const scrollViewRef = useRef<ScrollView>(null);
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

  return (
    <WorkoutExecutionLayout
      testID="demo-activity-content"
      title={DEMO_ACTIVITY.name}
      screenTitle="Demo Activity"
      timerId={DEMO_ACTIVITY.id}
      scrollRef={scrollViewRef}
      onBack={() => navigation.goBack()}
      onEdit={() => {}}
      notes="Demo activity for tutorial. Try tapping 'Mark Complete' on a set!"
      footer={
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: 16,
            paddingBottom: 34,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="bg-green-500 py-3 px-6 rounded-lg"
            accessibilityRole="button"
            accessibilityLabel="Done with demo"
          >
            <Text className="text-white text-center font-semibold text-lg">
              Done
            </Text>
          </TouchableOpacity>
        </View>
      }
    >
      <WorkoutExecutionSets
        activities={[{ ...DEMO_ACTIVITY, sets }]}
        onChange={changes =>
          changes.forEach(change =>
            handleUpdateSet(change.setId, change.updates)
          )
        }
      />
    </WorkoutExecutionLayout>
  );
}
