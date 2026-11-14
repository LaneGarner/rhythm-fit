import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

type TimerChoice = { id: string; name: string };

interface WorkoutTimerModule {
  addListener(
    event: 'onTimerChoices',
    listener: (event: { devices: TimerChoice[] }) => void
  ): { remove(): void };
  addListener(
    event: 'onCountUpStarted',
    listener: (event: { request: number; startedAt: number; resumed: boolean }) => void
  ): { remove(): void };
  syncWorkoutTimer?(deadline: number | null, countUpRequest: number | null, paused: boolean): Promise<void>;
  setWorkoutTimer(deadline: number | null, countUp: boolean): Promise<void>;
  selectTimer(id: string): Promise<void>;
  forgetTimer(): Promise<void>;
}

export const rogueTimer =
  Platform.OS === 'ios'
    ? requireOptionalNativeModule<WorkoutTimerModule>('RogueTimer')
    : null;
