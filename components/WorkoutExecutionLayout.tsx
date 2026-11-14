import React, { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import HeaderButton from './HeaderButton';
import {
  COLLAPSE_THRESHOLD,
  ContentHeader,
  StickyCompactHeader,
} from './StickyActivityHeader';
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
  onSkipRest,
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
  onSkipRest?: () => void;
  children: React.ReactNode;
  notes?: string;
  progression?: React.ReactNode;
  screenTitle?: string;
  scrollRef?: React.RefObject<ScrollView | null>;
  footer?: React.ReactNode;
  testID?: string;
}) {
  const { colors, colorScheme } = useTheme();
  const { insets, hasTopTabBar } = useResponsiveLayout();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [sectionBottom, setSectionBottom] = useState<number | null>(null);
  const [dockedTitleHeight, setDockedTitleHeight] = useState(0);
  const dockedTitleOpacity =
    sectionBottom === null || sectionBottom <= 0
      ? 0
      : scrollY.interpolate({
          inputRange: [sectionBottom, sectionBottom + 12],
          outputRange: [0, 1],
          extrapolate: 'clamp',
        });

  const dockedTitleSpace =
    sectionBottom === null || sectionBottom <= 0
      ? 0
      : scrollY.interpolate({
          inputRange: [
            Math.max(0, sectionBottom - dockedTitleHeight - 16),
            sectionBottom,
          ],
          outputRange: [0, dockedTitleHeight],
          extrapolate: 'clamp',
        });

  const titleHandoffEnd = Math.max(
    COLLAPSE_THRESHOLD + 13,
    (sectionBottom ?? COLLAPSE_THRESHOLD) + 12
  );
  const floatingTitleOpacity = scrollY.interpolate({
    inputRange: [
      COLLAPSE_THRESHOLD - 12,
      COLLAPSE_THRESHOLD,
      titleHandoffEnd - 12,
      titleHandoffEnd,
    ],
    outputRange: [0, 1, 1, 0],
    extrapolate: 'clamp',
  });

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
        {sectionBottom !== null && sectionBottom > COLLAPSE_THRESHOLD + 12 && (
          <StickyCompactHeader
            title={title}
            subtitle=""
            scrollY={scrollY}
            opacity={floatingTitleOpacity}
          />
        )}
        <Animated.ScrollView
          ref={scrollRef}
          stickyHeaderIndices={[1]}
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
          <View
            onLayout={({ nativeEvent: { layout } }) =>
              setSectionBottom(layout.y + layout.height)
            }
            style={{
              backgroundColor:
                colorScheme === 'dark' ? colors.background : colors.surface,
            }}
          >
            <ContentHeader title={title} subtitle="" scrollY={scrollY} />
            <CollapsibleTimer
              key={timerId}
              activityId={timerId}
              restToggle={restToggle}
            />
          </View>
          <View
            style={{
              backgroundColor:
                colorScheme === 'dark' ? colors.background : colors.surface,
            }}
          >
            <Animated.View
              style={{
                height: dockedTitleSpace,
                opacity: dockedTitleOpacity,
                overflow: 'hidden',
              }}
            >
              <Text
                accessibilityRole="header"
                numberOfLines={1}
                onLayout={({ nativeEvent: { layout } }) =>
                  setDockedTitleHeight(layout.height)
                }
                style={{
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: '600',
                  textAlign: 'center',
                  paddingHorizontal: 16,
                  paddingTop: 8,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                }}
              >
                {title}
              </Text>
            </Animated.View>
            <StickyCompactTimer
              activityId={timerId}
              activityName={timerName}
              scrollY={scrollY}
              threshold={sectionBottom}
              onSkipRest={onSkipRest}
            />
          </View>
          <View className="px-4 pt-4 pb-4" style={{ gap: 16 }}>
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
