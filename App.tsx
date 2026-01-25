import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider, useDispatch, useSelector } from 'react-redux';
import DevModeButton from './components/DevModeButton';
import SplashScreen from './components/SplashScreen';
import TabNavigator from './navigation/TabNavigator';
import {
  loadActivitiesFromStorage,
  setActivities,
} from './redux/activitySlice';
import { AppDispatch, RootState, store } from './redux/store';
import { ThemeContext, ThemeProvider } from './theme/ThemeContext';
import { WeekProvider } from './WeekContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TimerProvider } from './context/TimerContext';
import { syncActivities } from './services/syncService';
import { initializeExercises } from './services/exerciseService';
import { initializeActivityTypes } from './services/activityTypeService';
import { isBackendConfigured } from './config/api';
import { Activity } from './types/activity';

// Import screens
import ActivityExecutionScreen from './screens/ActivityExecutionScreen';
import ActivityLibraryScreen from './screens/ActivityLibraryScreen';
import ActivityScreen from './screens/ActivityScreen';
import AuthScreen from './screens/AuthScreen';
import DayScreen from './screens/DayScreen';
import EditActivityScreen from './screens/EditActivityScreen';
import SettingsScreen from './screens/SettingsScreen';

const Stack = createNativeStackNavigator();

// Dev mode configuration - __DEV__ is true in Expo dev, false in production builds
const DEV_MODE_ENABLED = __DEV__;

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Day: { date: string };
  Activity: { date: string };
  ActivityExecution: { activityId: string };
  EditActivity: { activityId: string };
  Settings: undefined;
  ActivityLibrary: undefined;
};

function AppContent() {
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const {
    user,
    isLoading: authLoading,
    getAccessToken,
    isConfigured,
  } = useAuth();
  const [hasSynced, setHasSynced] = useState(false);
  const activities = useSelector((state: RootState) => state.activities.data);

  const handleActivitiesUpdated = useCallback(
    (updatedActivities: Activity[]) => {
      dispatch(setActivities(updatedActivities));
    },
    [dispatch]
  );

  useEffect(() => {
    // Load activities from storage on app start
    dispatch(loadActivitiesFromStorage());
    // Initialize exercise database and activity types from backend
    initializeExercises();
    initializeActivityTypes();
  }, [dispatch]);

  // Sync activities when user is authenticated
  useEffect(() => {
    const performSync = async () => {
      if (user && isConfigured && isBackendConfigured() && !hasSynced) {
        const token = getAccessToken();
        if (token) {
          try {
            await syncActivities(token, activities, handleActivitiesUpdated);
            setHasSynced(true);
          } catch (err) {
            console.error('Failed to sync activities:', err);
          }
        }
      }
    };
    performSync();
  }, [
    user,
    isConfigured,
    hasSynced,
    getAccessToken,
    activities,
    handleActivitiesUpdated,
  ]);

  // Reset sync flag when user logs out
  useEffect(() => {
    if (!user) {
      setHasSynced(false);
    }
  }, [user]);

  // Lock orientation to portrait
  useEffect(() => {
    const lockOrientation = async () => {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    };
    lockOrientation();
  }, []);

  // Show loading while checking auth (only if backend is configured)
  if (authLoading && isConfigured) {
    return null;
  }

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
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen name="Day" component={DayScreen} />
          <Stack.Screen name="Activity" component={ActivityScreen} />
          <Stack.Screen
            name="ActivityExecution"
            component={ActivityExecutionScreen}
          />
          <Stack.Screen name="EditActivity" component={EditActivityScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen
            name="ActivityLibrary"
            component={ActivityLibraryScreen}
          />
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
          <AuthProvider>
            <TimerProvider>
              <WeekProvider>
                <AppContent />
              </WeekProvider>
            </TimerProvider>
          </AuthProvider>
        </ThemeProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
