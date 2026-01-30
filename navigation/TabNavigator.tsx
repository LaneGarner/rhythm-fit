import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import CalculatorScreen from '../screens/CalculatorScreen';
import CoachScreen from '../screens/CoachScreen';
import StatsScreen from '../screens/StatsScreen';
import WeeklyScreen from '../screens/WeeklyScreen';
import { useTheme } from '../theme/ThemeContext';

const Tab = createBottomTabNavigator();

// Custom tab bar button component
const CustomTabBarButton = ({ children, onPress, accessibilityState }: any) => {
  const { colors } = useTheme();
  const isFocused = accessibilityState?.selected;

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
        style={{
          marginTop: 5,
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
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: 34,
          paddingTop: 10,
          height: 80,
        },
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.tabBarInactive,
      }}
    >
      <Tab.Screen
        name="Weekly"
        component={WeeklyScreen}
        options={{
          tabBarLabel: 'Activities',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={24}
              color={color}
            />
          ),
          tabBarButton: props => <CustomTabBarButton {...props} />,
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
              size={24}
              color={color}
            />
          ),
          tabBarButton: props => <CustomTabBarButton {...props} />,
        }}
      />
      <Tab.Screen
        name="Calculator"
        component={CalculatorScreen}
        options={{
          tabBarLabel: 'Calculator',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'calculator' : 'calculator-outline'}
              size={24}
              color={color}
            />
          ),
          tabBarButton: props => <CustomTabBarButton {...props} />,
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
              size={24}
              color={color}
            />
          ),
          tabBarButton: props => <CustomTabBarButton {...props} />,
        }}
      />
    </Tab.Navigator>
  );
}
