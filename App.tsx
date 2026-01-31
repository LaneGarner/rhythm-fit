import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import DevModeButton from './components/DevModeButton';
import SplashScreen from './components/SplashScreen';
import { TutorialProvider } from './components/tutorial';
import TabNavigator from './navigation/TabNavigator';
import { store } from './redux/store';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { WeekProvider } from './WeekContext';
import { AuthProvider } from './context/AuthContext';
import { TimerProvider } from './context/TimerContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { useAppInitialization } from './hooks/useAppInitialization';

// Import screens
import ActivityExecutionScreen from './screens/ActivityExecutionScreen';
import ActivityLibraryScreen from './screens/ActivityLibraryScreen';
import ActivityScreen from './screens/ActivityScreen';
import AuthScreen from './screens/AuthScreen';
import DayScreen from './screens/DayScreen';
import DemoActivityExecutionScreen from './screens/DemoActivityExecutionScreen';
import EditActivityScreen from './screens/EditActivityScreen';
import EmojiLibraryScreen from './screens/EmojiLibraryScreen';
import EquipmentScreen from './screens/EquipmentScreen';
import ExerciseStatsScreen from './screens/ExerciseStatsScreen';
import PersonalRecordsScreen from './screens/PersonalRecordsScreen';
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
  DemoActivityExecution: undefined;
  SupersetExecution: { supersetId: string };
  EditActivity: { activityId: string };
  Settings: undefined;
  ActivityLibrary: undefined;
  EmojiLibrary: undefined;
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
          <Stack.Screen name="Day" component={DayScreen} />
          <Stack.Screen name="Activity" component={ActivityScreen} />
          <Stack.Screen
            name="ActivityExecution"
            component={ActivityExecutionScreen}
          />
          <Stack.Screen
            name="DemoActivityExecution"
            component={DemoActivityExecutionScreen}
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
  const { isReady, shouldShowTutorial } = useAppInitialization();
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList>>(null);

  if (!isReady) {
    return <SplashScreen />;
  }

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
    </GestureHandlerRootView>
  );
}
