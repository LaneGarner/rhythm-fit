import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

import type { WatchWorkoutType } from '../../utils/watchWorkoutType';
export {
  watchWorkoutTypes,
  type WatchWorkoutType,
} from '../../utils/watchWorkoutType';

export const watchWorkout =
  Platform.OS === 'ios' && !Platform.isPad
    ? requireOptionalNativeModule<{
        start(type: WatchWorkoutType): Promise<void>;
        exchangeSet(snapshot: string): Promise<string | null>;
        matches(type: WatchWorkoutType): Promise<boolean>;
        addListener(
          event: 'onCompanionUpdate',
          listener: () => void
        ): { remove(): void };
        state(): Promise<'running' | 'paused' | null>;
        control(command: 'pause' | 'resume' | 'end'): Promise<void>;
      }>('WatchWorkout')
    : null;
