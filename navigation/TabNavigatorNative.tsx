import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import React, { useEffect } from 'react';
import CoachScreen from '../screens/CoachScreen';
import StatsScreen from '../screens/StatsScreen';
import WeeklyStackNavigator from './WeeklyStackNavigator';
import { useTheme } from '../theme/ThemeContext';
import { useTutorial } from '../components/tutorial';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

const Tab = createNativeBottomTabNavigator();

// Settings lives in the root stack; this tab only acts as a launcher for it,
// so it never renders its own screen.
const SettingsTabPlaceholder = () => null;

// Approximate height of the native iOS tab bar (excluding the safe-area inset).
const TAB_BAR_BASE_HEIGHT = 49;

// The native tab bar is rendered by UIKit, so its buttons aren't React views we
// can measure(). To keep the onboarding tutorial spotlight pointing at the right
// tabs, we register approximate frames derived from screen geometry instead.
const TUTORIAL_TAB_TARGETS = [
  'weekly-tab-button',
  'stats-tab-button',
  'coach-tab-button',
  'settings-tab-button',
];

function useTutorialTabTargets() {
  const { registerTarget, unregisterTarget, isActive } = useTutorial();
  const { width, height, insets } = useResponsiveLayout();

  useEffect(() => {
    if (!isActive) return;

    const usableWidth = width - insets.left - insets.right;
    const tabWidth = usableWidth / TUTORIAL_TAB_TARGETS.length;
    const cellHeight = TAB_BAR_BASE_HEIGHT;
    const pageY = height - insets.bottom - cellHeight;

    TUTORIAL_TAB_TARGETS.forEach((targetId, index) => {
      const pageX = insets.left + index * tabWidth;
      registerTarget(targetId, {
        x: pageX,
        y: pageY,
        width: tabWidth,
        height: cellHeight,
        pageX,
        pageY,
      });
    });

    return () => {
      TUTORIAL_TAB_TARGETS.forEach(unregisterTarget);
    };
  }, [
    isActive,
    width,
    height,
    insets.left,
    insets.right,
    insets.bottom,
    registerTarget,
    unregisterTarget,
  ]);
}

export default function TabNavigatorNative() {
  const { colors } = useTheme();
  useTutorialTabTargets();

  return (
    <Tab.Navigator
      labeled={false}
      translucent
      tabBarActiveTintColor={colors.primary.main}
      tabBarInactiveTintColor={colors.tabBarInactive}
    >
      <Tab.Screen
        name="Weekly"
        component={WeeklyStackNavigator}
        options={{
          tabBarLabel: 'Activities',
          tabBarIcon: () => ({ sfSymbol: 'calendar' }),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: 'Stats',
          tabBarIcon: ({ focused }) => ({
            sfSymbol: focused ? 'chart.bar.fill' : 'chart.bar',
          }),
        }}
      />
      <Tab.Screen
        name="Coach"
        component={CoachScreen}
        options={{
          tabBarLabel: 'Coach',
          tabBarIcon: ({ focused }) => ({
            sfSymbol: focused ? 'trophy.fill' : 'trophy',
          }),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsTabPlaceholder}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: () => ({ sfSymbol: 'line.3.horizontal' }),
          // Don't switch to the placeholder tab — keep the launcher behavior.
          preventsDefault: true,
        }}
        listeners={({ navigation }) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.navigate('Settings');
          },
        })}
      />
    </Tab.Navigator>
  );
}
