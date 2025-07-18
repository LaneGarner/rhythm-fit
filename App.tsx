import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import React, { useContext, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider, useDispatch } from 'react-redux';
import DevModeButton from './components/DevModeButton';
import SplashScreen from './components/SplashScreen';
import TabNavigator from './navigation/TabNavigator';
import { loadActivitiesFromStorage } from './redux/activitySlice';
import { AppDispatch, store } from './redux/store';
import { ThemeContext, ThemeProvider } from './theme/ThemeContext';
import { WeekProvider } from './WeekContext';

// Import screens
import ActivityExecutionScreen from './screens/ActivityExecutionScreen';
import ActivityScreen from './screens/ActivityScreen';
import DayScreen from './screens/DayScreen';
import EditActivityScreen from './screens/EditActivityScreen';
import SettingsScreen from './screens/SettingsScreen';

const Stack = createNativeStackNavigator();

// Dev mode configuration
const DEV_MODE_ENABLED = true; // Set to false to hide the button

export type RootStackParamList = {
  Main: undefined;
  Day: { date: string };
  Activity: { date: string };
  ActivityExecution: { activityId: string };
  EditActivity: { activityId: string };
  Settings: undefined;
};

function AppContent() {
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);

  useEffect(() => {
    // Load activities from storage on app start
    dispatch(loadActivitiesFromStorage());
  }, [dispatch]);

  // Lock orientation to portrait
  useEffect(() => {
    const lockOrientation = async () => {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    };
    lockOrientation();
  }, []);

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

      {/* Dev mode button */}
      <DevModeButton visible={DEV_MODE_ENABLED} />
    </>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <SplashScreen onFinish={() => setIsLoading(false)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <ThemeProvider>
          <WeekProvider>
            <AppContent />
          </WeekProvider>
        </ThemeProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
