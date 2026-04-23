import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

export type LiveActivityMode = 'countUp' | 'countDown' | 'emom' | 'rest';

export interface LiveActivityState {
  mode: LiveActivityMode;
  startedAt: number; // ms epoch
  endsAt?: number | null; // ms epoch; required for countdown/rest/emom
  isPaused?: boolean;
  emomCurrentRound?: number | null;
  emomTotalRounds?: number | null;
  setProgressText?: string | null;
}

export interface LiveActivityStartOptions extends LiveActivityState {
  activityId: string;
  activityName: string;
}

export interface LiveActivityEndOptions {
  activityKitId?: string;
  dismissalPolicy?: 'immediate' | 'afterSeconds' | 'default';
  dismissAfterSeconds?: number;
  finalState?: LiveActivityState;
}

interface NativeModule {
  areEnabled(): Promise<boolean>;
  start(options: LiveActivityStartOptions): Promise<string | null>;
  update(
    options: LiveActivityState & { activityKitId?: string }
  ): Promise<void>;
  end(options: LiveActivityEndOptions): Promise<void>;
  endAll(): Promise<void>;
}

const native = requireOptionalNativeModule<NativeModule>('LiveActivity');

const isSupported = Platform.OS === 'ios' && !!native;

function sanitize<T extends object>(obj: T): T {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) clean[k] = v;
  }
  return clean as T;
}

export async function areEnabled(): Promise<boolean> {
  if (!isSupported) return false;
  try {
    return await native!.areEnabled();
  } catch {
    return false;
  }
}

export async function start(
  options: LiveActivityStartOptions
): Promise<string | null> {
  if (!isSupported) return null;
  try {
    return await native!.start(sanitize(options));
  } catch {
    return null;
  }
}

export async function update(
  options: LiveActivityState & { activityKitId?: string }
): Promise<void> {
  if (!isSupported) return;
  try {
    await native!.update(sanitize(options));
  } catch {
    // no-op
  }
}

export async function end(options: LiveActivityEndOptions = {}): Promise<void> {
  if (!isSupported) return;
  try {
    await native!.end(sanitize(options));
  } catch {
    // no-op
  }
}

export async function endAll(): Promise<void> {
  if (!isSupported) return;
  try {
    await native!.endAll();
  } catch {
    // no-op
  }
}

export const LiveActivity = {
  areEnabled,
  start,
  update,
  end,
  endAll,
  isSupported,
};
