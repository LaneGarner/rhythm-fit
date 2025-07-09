import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useContext, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider, useDispatch } from 'react-redux';
import { setActivities } from './redux/activitySlice';
import { store } from './redux/store';
import { ThemeContext, ThemeProvider } from './theme/ThemeContext';
import { loadActivities } from './utils/storage';

// Import screens
import TabNavigator from './navigation/TabNavigator';
import ActivityExecutionScreen from './screens/ActivityExecutionScreen';
import ActivityScreen from './screens/ActivityScreen';
import DayScreen from './screens/DayScreen';
import EditActivityScreen from './screens/EditActivityScreen';
import SettingsScreen from './screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export type RootStackParamList = {
  Main: undefined;
  Day: undefined;
  Activity: undefined;
  ActivityExecution: undefined;
  EditActivity: undefined;
  Settings: undefined;
};

function AppContent() {
  const dispatch = useDispatch();
  const { colorScheme } = useContext(ThemeContext);

  useEffect(() => {
    // Load activities from storage on app start
    const loadData = async () => {
      const activities = await loadActivities();
      dispatch(setActivities(activities));
    };
    loadData();
  }, [dispatch]);

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Main"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen name="Day" component={DayScreen} />
          <Stack.Screen name="Activity" component={ActivityScreen} />
          <Stack.Screen
            name="ActivityExecution"
            component={ActivityExecutionScreen}
          />
          <Stack.Screen name="EditActivity" component={EditActivityScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
