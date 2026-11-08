import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import WorkoutExecutionScreen from '../screens/WorkoutExecutionScreen';
import DayScreen from '../screens/DayScreen';
import WeeklyScreen from '../screens/WeeklyScreen';

export type WeeklyStackParamList = {
  WeeklyHome: undefined;
  Day: { date: string };
  ActivityExecution: { activityId: string };
  SupersetExecution: { supersetId: string };
};

const Stack = createNativeStackNavigator<WeeklyStackParamList>();

export default function WeeklyStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WeeklyHome" component={WeeklyScreen} />
      <Stack.Screen name="Day" component={DayScreen} />
      <Stack.Screen
        name="ActivityExecution"
        component={WorkoutExecutionScreen}
      />
      <Stack.Screen
        name="SupersetExecution"
        component={WorkoutExecutionScreen}
      />
    </Stack.Navigator>
  );
}
