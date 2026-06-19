import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import DevModeButton from './components/DevModeButton';
import { TutorialProvider } from './components/tutorial';
import TabNavigator from './navigation/TabNavigator';
import { store } from './redux/store';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { WeekProvider } from './WeekContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TimerProvider } from './context/TimerContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useNotificationScheduler } from './hooks/useNotificationScheduler';
import { useOrientationLock } from './hooks/useOrientationLock';
import {
  configureNotificationHandler,
  getPermissionStatus,
  NotificationPayload,
} from './services/notifications';
import { registerAndSavePushToken } from './services/pushToken';

configureNotificationHandler();

// Import screens
import ActivityLibraryScreen from './screens/ActivityLibraryScreen';
import ActivityScreen from './screens/ActivityScreen';
import AuthScreen from './screens/AuthScreen';
import DemoActivityExecutionScreen from './screens/DemoActivityExecutionScreen';
import EditActivityScreen from './screens/EditActivityScreen';
import EquipmentScreen from './screens/EquipmentScreen';
import ExerciseStatsScreen from './screens/ExerciseStatsScreen';
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';
import PersonalRecordsScreen from './screens/PersonalRecordsScreen';
import SettingsScreen from './screens/SettingsScreen';

const Stack = createNativeStackNavigator();

// Dev mode configuration - __DEV__ is true in Expo dev, false in production builds
const DEV_MODE_ENABLED = __DEV__;

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Activity: { date: string };
  DemoActivityExecution: undefined;
  EditActivity: { activityId: string; supersetId?: string };
  Settings: undefined;
  NotificationSettings: undefined;
  ActivityLibrary: undefined;
  Equipment: undefined;
  ExerciseStats: { exerciseName: string };
  PersonalRecords: undefined;
};

interface AppContentProps {
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>;
  shouldShowTutorial: boolean;
}

function AppContent({ navigationRef, shouldShowTutorial }: AppContentProps) {
  const { colorScheme } = useTheme();
  const { user, getAccessToken } = useAuth();

  useNotificationScheduler();

  // Register Expo push token with backend once the user is authenticated and
  // notification permission is granted.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const status = await getPermissionStatus();
      if (status !== 'granted') return;
      const token = getAccessToken();
      if (token) {
        await registerAndSavePushToken(token);
      }
    })();
  }, [user, getAccessToken]);

  // Handle Live Activity taps (Dynamic Island / Lock Screen banner).
  // The widget's widgetURL is `rhythm://timer/<activityId>`. Opening the app
  // is the primary affordance — the sticky timer component surfaces inside
  // the app, letting the user resume or view the running activity.
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url || !url.startsWith('rhythm://timer/')) return;
      if (!navigationRef.current) return;
      navigationRef.current.navigate('Main');
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) =>
      handleUrl(url)
    );
    return () => subscription.remove();
  }, [navigationRef]);

  // Handle notification taps → deep link to relevant screen.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      response => {
        const data = response.notification.request.content.data as unknown as
          | NotificationPayload
          | undefined;
        if (!data || !navigationRef.current) return;
        switch (data.kind) {
          case 'unfinished-workout':
          case 'scheduled-reminder':
            if (data.date) {
              navigationRef.current.navigate('Activity', { date: data.date });
            }
            break;
          case 'inactivity-nudge':
          case 'weekly-summary':
            navigationRef.current.navigate('Main');
            break;
          case 'timer-completion':
          case 'rest-timer':
          default:
            // Timer notifications — opening the app is enough.
            break;
        }
      }
    );
    return () => subscription.remove();
  }, [navigationRef]);

  return (
    <TutorialProvider
      navigationRef={navigationRef}
      shouldAutoStart={shouldShowTutorial}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName="Main"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen name="Activity" component={ActivityScreen} />
          <Stack.Screen
            name="DemoActivityExecution"
            component={DemoActivityExecutionScreen}
          />
          <Stack.Screen name="EditActivity" component={EditActivityScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen
            name="NotificationSettings"
            component={NotificationSettingsScreen}
          />
          <Stack.Screen
            name="ActivityLibrary"
            component={ActivityLibraryScreen}
          />
          <Stack.Screen name="Equipment" component={EquipmentScreen} />
          <Stack.Screen name="ExerciseStats" component={ExerciseStatsScreen} />
          <Stack.Screen
            name="PersonalRecords"
            component={PersonalRecordsScreen}
          />
        </Stack.Navigator>
      </NavigationContainer>

      {/* Dev mode button */}
      <DevModeButton visible={DEV_MODE_ENABLED} />
    </TutorialProvider>
  );
}

function AppInitializer() {
  const { shouldShowTutorial } = useAppInitialization();
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList>>(null);

  useOrientationLock();

  return (
    <AppContent
      navigationRef={navigationRef}
      shouldShowTutorial={shouldShowTutorial}
    />
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <ThemeProvider>
            <AuthProvider>
              <PreferencesProvider>
                <TimerProvider>
                  <WeekProvider>
                    <AppInitializer />
                  </WeekProvider>
                </TimerProvider>
              </PreferencesProvider>
            </AuthProvider>
          </ThemeProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
