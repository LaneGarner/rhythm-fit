import React, { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import HeaderButton from './HeaderButton';
import { ContentHeader, StickyCompactHeader } from './StickyActivityHeader';
import StickyCompactTimer from './StickyCompactTimer';
import CollapsibleTimer from './CollapsibleTimer';
import NotesCard from './NotesCard';

export default function WorkoutExecutionLayout({
  title,
  timerId,
  timerName = title,
  onBack,
  onEdit,
  restToggle,
  children,
  notes,
  progression,
  screenTitle = 'Activity',
  scrollRef,
  footer,
  testID,
}: {
  title: string;
  timerId: string;
  timerName?: string;
  onBack: () => void;
  onEdit: () => void;
  restToggle?: { enabled: boolean; onToggle: (value: boolean) => void };
  children: React.ReactNode;
  notes?: string;
  progression?: React.ReactNode;
  screenTitle?: string;
  scrollRef?: React.RefObject<ScrollView | null>;
  footer?: React.ReactNode;
  testID?: string;
}) {
  const { colors } = useTheme();
  const { insets, hasTopTabBar } = useResponsiveLayout();
  const [expanded, setExpanded] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', event =>
      setKeyboardHeight(event.endCoordinates.height)
    );
    const hide = Keyboard.addListener('keyboardWillHide', () =>
      setKeyboardHeight(0)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background }}
      testID={testID}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: insets.top + (hasTopTabBar ? 64 : 16),
          paddingBottom: 16,
          paddingLeft: Math.max(16, insets.left),
          paddingRight: Math.max(16, insets.right),
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <HeaderButton label="Back" onPress={onBack} />
        <Text
          style={{
            flex: 1,
            fontSize: 17,
            fontWeight: '600',
            color: colors.text,
            textAlign: 'center',
          }}
        >
          {screenTitle}
        </Text>
        <HeaderButton label="Edit" onPress={onEdit} />
      </View>
      <View style={{ flex: 1, position: 'relative' }}>
        <StickyCompactHeader title={title} subtitle="" scrollY={scrollY} />
        <StickyCompactTimer
          activityId={timerId}
          activityName={timerName}
          scrollY={scrollY}
          isExpanded={expanded}
        />
        <Animated.ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: keyboardHeight ? keyboardHeight + 100 : 200,
          }}
          keyboardShouldPersistTaps="handled"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          <ContentHeader title={title} subtitle="" scrollY={scrollY} />
          <View className="px-4 pt-2 pb-4" style={{ gap: 16 }}>
            <CollapsibleTimer
              key={timerId}
              activityId={timerId}
              activityName={timerName}
              onExpandedChange={setExpanded}
              restToggle={restToggle}
            />
            {children}
            <NotesCard notes={notes || ''} />
            {progression}
          </View>
        </Animated.ScrollView>
      </View>
      {footer}
    </View>
  );
}
