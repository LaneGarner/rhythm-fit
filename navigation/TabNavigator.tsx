import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { useCallback, useRef } from 'react';
import { TouchableOpacity, View } from 'react-native';
import CoachScreen from '../screens/CoachScreen';
import StatsScreen from '../screens/StatsScreen';
import WeeklyStackNavigator from './WeeklyStackNavigator';
import { useTheme } from '../theme/ThemeContext';
import { useTutorial } from '../components/tutorial';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

const Tab = createBottomTabNavigator();

// Settings lives in the root stack; this tab only acts as a launcher for it,
// so it never renders its own screen.
const SettingsTabPlaceholder = () => null;

// Custom tab bar button component with tutorial target registration
const CustomTabBarButton = ({
  children,
  onPress,
  accessibilityState,
  targetId,
}: any) => {
  const { colors } = useTheme();
  const {
    registerTarget,
    unregisterTarget,
    isActive: tutorialActive,
  } = useTutorial();
  const isFocused = accessibilityState?.selected;
  const viewRef = useRef<View>(null);

  const handleLayout = useCallback(() => {
    if (targetId && viewRef.current) {
      viewRef.current.measure((x, y, width, height, pageX, pageY) => {
        registerTarget(targetId, { x, y, width, height, pageX, pageY });
      });
    }
  }, [targetId, registerTarget]);

  // Re-register when tutorial becomes active or tab focus changes
  React.useEffect(() => {
    if (tutorialActive && targetId) {
      // Small delay to ensure layout is stable
      const timer = setTimeout(handleLayout, 100);
      return () => clearTimeout(timer);
    }
    return () => {
      if (targetId) {
        unregisterTarget(targetId);
      }
    };
  }, [tutorialActive, targetId, handleLayout, unregisterTarget, isFocused]);

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={14}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
      }}
      accessibilityState={accessibilityState}
    >
      <View
        ref={viewRef}
        onLayout={handleLayout}
        style={{
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
        {/* Current screen indicator */}
        {isFocused && (
          <View
            style={{
              position: 'absolute',
              bottom: -8,
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.primary.main,
            }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function TabNavigator() {
  const { colors } = useTheme();
  const { isLandscape, insets } = useResponsiveLayout();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom / 2,
          height: (isLandscape ? 44 : 48) + insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.tabBarInactive,
      }}
    >
      <Tab.Screen
        name="Weekly"
        component={WeeklyStackNavigator}
        options={{
          tabBarLabel: 'Activities',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={26}
              color={color}
            />
          ),
          tabBarButton: props => (
            <CustomTabBarButton {...props} targetId="weekly-tab-button" />
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: 'Stats',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'bar-chart' : 'bar-chart-outline'}
              size={26}
              color={color}
            />
          ),
          tabBarButton: props => (
            <CustomTabBarButton {...props} targetId="stats-tab-button" />
          ),
        }}
      />
      <Tab.Screen
        name="Coach"
        component={CoachScreen}
        options={{
          tabBarLabel: 'Coach',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'chatbubble' : 'chatbubble-outline'}
              size={26}
              color={color}
            />
          ),
          tabBarButton: props => (
            <CustomTabBarButton {...props} targetId="coach-tab-button" />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsTabPlaceholder}
        options={{
          tabBarLabel: 'Settings',
          tabBarAccessibilityLabel: 'Settings & Preferences',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-circle-outline" size={26} color={color} />
          ),
          tabBarButton: props => (
            <CustomTabBarButton {...props} targetId="settings-tab-button" />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: e => {
            // Don't switch to the placeholder tab — open the Settings screen.
            e.preventDefault();
            navigation.navigate('Settings');
          },
        })}
      />
    </Tab.Navigator>
  );
}
