import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

type TimerChoice = { id: string; name: string };

interface WorkoutTimerModule {
  addListener(
    event: 'onTimerChoices',
    listener: (event: { devices: TimerChoice[] }) => void
  ): { remove(): void };
  setWorkoutTimer(deadline: number | null, countUp: boolean): Promise<void>;
  selectTimer(id: string): Promise<void>;
  forgetTimer(): Promise<void>;
}

export const rogueTimer =
  Platform.OS === 'ios'
    ? requireOptionalNativeModule<WorkoutTimerModule>('RogueTimer')
    : null;
