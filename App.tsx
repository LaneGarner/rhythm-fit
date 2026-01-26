import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
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
import EmojiLibraryScreen from './screens/EmojiLibraryScreen';
import EquipmentScreen from './screens/EquipmentScreen';
import SettingsScreen from './screens/SettingsScreen';
import SupersetExecutionScreen from './screens/SupersetExecutionScreen';

const Stack = createNativeStackNavigator();

// Dev mode configuration - __DEV__ is true in Expo dev, false in production builds
const DEV_MODE_ENABLED = __DEV__;

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Day: { date: string };
  Activity: { date: string };
  ActivityExecution: { activityId: string };
  SupersetExecution: { supersetId: string };
  EditActivity: { activityId: string };
  Settings: undefined;
  ActivityLibrary: undefined;
  EmojiLibrary: undefined;
  Equipment: undefined;
};

function AppContent({ isInitialLoad }: { isInitialLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const {
    user,
    isLoading: authLoading,
    getAccessToken,
    isConfigured,
  } = useAuth();
  const [hasSynced, setHasSynced] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
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
          setIsSyncing(true);
          try {
            await syncActivities(token, activities, handleActivitiesUpdated);
            setHasSynced(true);
          } catch (err) {
            console.error('Failed to sync activities:', err);
          } finally {
            setIsSyncing(false);
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

  // Show loading screen while syncing after login (but not during initial load)
  if (isSyncing && !isInitialLoad) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colorScheme === 'dark' ? '#000' : '#F9FAFB',
        }}
      >
        <ActivityIndicator
          size="large"
          color={colorScheme === 'dark' ? '#60A5FA' : '#2563EB'}
        />
        <Text
          style={{
            marginTop: 16,
            fontSize: 16,
            color: colorScheme === 'dark' ? '#9CA3AF' : '#6B7280',
          }}
        >
          Loading your data...
        </Text>
      </View>
    );
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
          <Stack.Screen
            name="SupersetExecution"
            component={SupersetExecutionScreen}
          />
          <Stack.Screen name="EditActivity" component={EditActivityScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen
            name="ActivityLibrary"
            component={ActivityLibraryScreen}
          />
          <Stack.Screen name="EmojiLibrary" component={EmojiLibraryScreen} />
          <Stack.Screen name="Equipment" component={EquipmentScreen} />
        </Stack.Navigator>
      </NavigationContainer>

      {/* Dev mode button */}
      <DevModeButton visible={DEV_MODE_ENABLED} />
    </>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Give a brief moment for sync to start before marking initial load complete
      setTimeout(() => setIsInitialLoad(false), 500);
    }, 3000);
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
                <AppContent isInitialLoad={isInitialLoad} />
              </WeekProvider>
            </TimerProvider>
          </AuthProvider>
        </ThemeProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
