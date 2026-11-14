import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { Alert, AppState, AppStateStatus, Vibration } from 'react-native';
import type { AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { rogueTimer } from '../modules/rogue-timer';
import { usePreferences } from './PreferencesContext';
import {
  cancelTimerCompletion,
  scheduleTimerCompletion,
} from '../services/notifications';

type LiveActivityMode = 'countUp' | 'countDown' | 'emom' | 'rest';
type ExpoAudioApi = typeof import('expo-audio');

type TimerMode = 'countUp' | 'countDown' | 'emom';

interface TimerState {
  activityId: string | null;
  activityName: string;
  seconds: number;
  isRunning: boolean;
  startedAt: number | null;
  mode: TimerMode;
  targetSeconds: number; // For countdown mode
  emomIntervalSeconds: number;
  emomTotalRounds: number;
  emomCurrentRound: number; // 1-based while running; 0 when idle
}

interface TimerContextValue {
  timer: TimerState;
  startTimer: (activityId: string, activityName: string) => boolean;
  switchTimer: (activityId: string, activityName: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  stopTimer: () => void;
  setTimerMode: (mode: TimerMode) => void;
  setTargetSeconds: (seconds: number) => void;
  setEmomInterval: (seconds: number) => void;
  setEmomRounds: (rounds: number) => void;
  startCountdown: (
    activityId: string,
    activityName: string,
    seconds: number
  ) => void;
  formatTime: (seconds: number) => string;
}

type TimerActions = Omit<TimerContextValue, 'timer'> & {
  getTimerState: () => TimerState;
};
type TimerMetadata = Omit<TimerState, 'seconds'> & {
  hasTimeRemaining: boolean;
};
const TimerActionsContext = createContext<TimerActions | undefined>(undefined);
const TimerMetadataContext = createContext<TimerMetadata | undefined>(
  undefined
);

const initialState: TimerState = {
  activityId: null,
  activityName: '',
  seconds: 0,
  isRunning: false,
  startedAt: null,
  mode: 'countUp',
  targetSeconds: 0,
  emomIntervalSeconds: 60,
  emomTotalRounds: 5,
  emomCurrentRound: 0,
};

const TimerContext = createContext<TimerContextValue | undefined>(undefined);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timer, setTimer] = useState<TimerState>(initialState);
  const [timerFinished, setTimerFinished] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const finishAlertRef = useRef<string | null>(null);
  const {
    timerVibration,
    timerSound,
    notificationSettings,
    rogueTimerEnabled,
  } = usePreferences();

  const rogueDeadline =
    rogueTimerEnabled &&
    timer.mode === 'countDown' &&
    timer.isRunning &&
    timer.startedAt !== null &&
    timer.targetSeconds > 0
      ? timer.startedAt + timer.targetSeconds * 1000
      : null;
  const rogueCountUpStartedAt =
    rogueTimerEnabled && timer.mode === 'countUp' && timer.isRunning
      ? timer.startedAt
      : null;
  useEffect(() => {
    const subscription = rogueTimer?.addListener(
      'onTimerChoices',
      ({ devices }) => {
        Alert.alert(
          'Choose a workout timer',
          'Match the device identifier, or bring only your timer into range.',
          [
            ...devices.map(({ id, name }) => ({
              text: `${name} · ${id.slice(-4)}`,
              onPress: () => rogueTimer?.selectTimer(id).catch(console.warn),
            })),
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    );
    return () => subscription?.remove();
  }, []);

  const countUpPaused =
    rogueTimerEnabled && timer.mode === 'countUp' && !timer.isRunning && timer.seconds > 0;
  const alignedCountUpStart = useRef<number | null>(null);
  const countUpOffset = useRef(0);
  useEffect(() => {
    if (!rogueTimer?.syncWorkoutTimer) return;
    const subscription = rogueTimer.addListener(
      'onCountUpStarted',
      ({ request, startedAt, resumed }) => {
        setTimer(prev => {
          if (!prev.isRunning || prev.mode !== 'countUp' || prev.startedAt !== request) return prev;
          const seconds = resumed ? countUpOffset.current : 0;
          const alignedStart = startedAt - seconds * 1000;
          alignedCountUpStart.current = alignedStart;
          return { ...prev, startedAt: alignedStart, seconds };
        });
      }
    );
    return () => subscription.remove();
  }, []);

  const hadExternalTimer = useRef(false);
  useEffect(() => {
    const active = rogueDeadline !== null || rogueCountUpStartedAt !== null;
    if (rogueCountUpStartedAt !== null && rogueCountUpStartedAt === alignedCountUpStart.current) return;
    alignedCountUpStart.current = null;
    if (!active && !countUpPaused && !hadExternalTimer.current) return;
    hadExternalTimer.current = active || countUpPaused;
    if (rogueTimer?.syncWorkoutTimer) {
      rogueTimer.syncWorkoutTimer(rogueDeadline, rogueCountUpStartedAt, countUpPaused).catch(console.warn);
      return;
    }
    rogueTimer
      ?.setWorkoutTimer(rogueDeadline, rogueCountUpStartedAt !== null)
      .catch(console.warn);
  }, [rogueDeadline, rogueCountUpStartedAt, countUpPaused]);

  const timerVibrationRef = useRef(timerVibration);
  const timerSoundRef = useRef(timerSound);
  const notificationSettingsRef = useRef(notificationSettings);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const audioModeConfiguredRef = useRef(false);

  const getTimerAudioPlayer =
    useCallback(async (): Promise<AudioPlayer | null> => {
      try {
        const { createAudioPlayer, setAudioModeAsync } =
          require('expo-audio') as ExpoAudioApi;

        if (!audioModeConfiguredRef.current) {
          await setAudioModeAsync({ playsInSilentMode: true });
          audioModeConfiguredRef.current = true;
        }

        if (!audioPlayerRef.current) {
          audioPlayerRef.current = createAudioPlayer(
            require('../assets/sounds/timer-complete.wav')
          );
        }

        return audioPlayerRef.current;
      } catch (error) {
        console.error('Failed to load timer audio:', error);
        return null;
      }
    }, []);

  useEffect(() => {
    return () => {
      audioPlayerRef.current?.remove();
      audioPlayerRef.current = null;
      audioModeConfiguredRef.current = false;
    };
  }, []);

  // Keep refs in sync with preference values (refs needed inside setInterval callback)
  useEffect(() => {
    timerVibrationRef.current = timerVibration;
  }, [timerVibration]);

  useEffect(() => {
    timerSoundRef.current = timerSound;
  }, [timerSound]);

  useEffect(() => {
    notificationSettingsRef.current = notificationSettings;
    if (
      !notificationSettings.enabled ||
      !notificationSettings.timerCompletion
    ) {
      Promise.all([
        cancelTimerCompletion('timer-completion'),
        cancelTimerCompletion('rest-timer'),
      ]).catch(() => {});
    }
  }, [notificationSettings]);

  const scheduleTimerNotification = useCallback(
    (
      activityName: string,
      completionAt: number,
      kind: 'timer-completion' | 'rest-timer' = 'timer-completion'
    ) => {
      const settings = notificationSettingsRef.current;
      if (!settings.enabled || !settings.timerCompletion) return;
      const staleKind =
        kind === 'rest-timer' ? 'timer-completion' : 'rest-timer';
      cancelTimerCompletion(staleKind)
        .then(() => scheduleTimerCompletion(activityName, completionAt, kind))
        .catch(() => {});
    },
    []
  );

  const cancelTimerNotification = useCallback(() => {
    Promise.all([
      cancelTimerCompletion('timer-completion'),
      cancelTimerCompletion('rest-timer'),
    ]).catch(() => {});
  }, []);

  const vibrationActiveRef = useRef(false);
  const vibrationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const startLiveActivity = useCallback(
    async (
      activityId: string,
      activityName: string,
      mode: LiveActivityMode,
      startedAt: number,
      endsAt: number | null,
      extra?: {
        emomCurrentRound?: number;
        emomTotalRounds?: number;
      }
    ) => {
      void activityId;
      void activityName;
      void mode;
      void startedAt;
      void endsAt;
      void extra;
    },
    []
  );

  const updateLiveActivity = useCallback(
    async (
      mode: LiveActivityMode,
      startedAt: number,
      endsAt: number | null,
      isPaused: boolean,
      extra?: {
        emomCurrentRound?: number;
        emomTotalRounds?: number;
      }
    ) => {
      void mode;
      void startedAt;
      void endsAt;
      void isPaused;
      void extra;
    },
    []
  );

  const endLiveActivity = useCallback(async (dismissAfterSeconds = 4) => {
    void dismissAfterSeconds;
  }, []);

  const endLiveActivityImmediate = useCallback(async () => {
    return;
  }, []);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const playVibrationPattern = useCallback(async () => {
    if (!vibrationActiveRef.current) return;
    // Pattern: BUZZ tap tap [wait] BUZZ tap tap tap
    if (timerSoundRef.current) {
      const player = await getTimerAudioPlayer();
      if (player) {
        await player.seekTo(0);
        player.play();
      }
    }
    Vibration.vibrate();
    await delay(500);
    if (!vibrationActiveRef.current) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await delay(150);
    if (!vibrationActiveRef.current) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await delay(400);
    if (!vibrationActiveRef.current) return;
    Vibration.vibrate();
    await delay(500);
    if (!vibrationActiveRef.current) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await delay(150);
    if (!vibrationActiveRef.current) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await delay(150);
    if (!vibrationActiveRef.current) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [getTimerAudioPlayer]);

  const stopVibration = useCallback(() => {
    vibrationActiveRef.current = false;
    Vibration.cancel();
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
  }, []);

  const playCompletionFeedback = useCallback(() => {
    if (timerVibrationRef.current) {
      vibrationActiveRef.current = true;
      playVibrationPattern();
      vibrationIntervalRef.current = setInterval(() => {
        playVibrationPattern();
      }, 3000);
    }
  }, [playVibrationPattern]);

  // One-shot variant for per-interval EMOM dings — no repeating setInterval.
  const playIntervalFeedback = useCallback(() => {
    if (timerVibrationRef.current) {
      vibrationActiveRef.current = true;
      playVibrationPattern();
      setTimeout(() => {
        vibrationActiveRef.current = false;
      }, 2400);
    }
  }, [playVibrationPattern]);

  // Show alert when countdown finishes
  useEffect(() => {
    if (timerFinished) {
      Alert.alert(
        'Timer Complete',
        `Your timer for "${timerFinished}" has finished!`,
        [
          {
            text: 'OK',
            onPress: () => {
              stopVibration();
              setTimerFinished(null);
            },
          },
        ]
      );
    }
  }, [timerFinished, stopVibration]);

  // Check for pending finish alert after state updates
  useEffect(() => {
    if (finishAlertRef.current && !timer.isRunning && timer.seconds === 0) {
      setTimerFinished(finishAlertRef.current);
      finishAlertRef.current = null;
    }
  }, [timer.isRunning, timer.seconds]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          // App has come to foreground
          if (timer.isRunning && timer.startedAt) {
            const now = Date.now();
            const elapsed = Math.floor((now - timer.startedAt) / 1000);

            if (timer.mode === 'countUp') {
              setTimer(prev => ({ ...prev, seconds: elapsed }));
            } else if (timer.mode === 'emom') {
              // EMOM: figure out how many rounds elapsed and land at the
              // correct round/remaining-seconds. Skip firing intermediate
              // dings that were missed while backgrounded.
              const intervalLen = timer.emomIntervalSeconds || 1;
              const roundsAdvanced = Math.floor(elapsed / intervalLen);
              const intervalElapsed = elapsed % intervalLen;
              const newRound = timer.emomCurrentRound + roundsAdvanced;

              if (newRound > timer.emomTotalRounds) {
                // All rounds finished while backgrounded
                playCompletionFeedback();
                setTimerFinished(timer.activityName);
                cancelTimerNotification();
                endLiveActivity();
                setTimer(prev => ({
                  ...prev,
                  seconds: 0,
                  isRunning: false,
                  startedAt: null,
                  emomCurrentRound: 0,
                }));
              } else {
                const newStartedAt = now - intervalElapsed * 1000;
                setTimer(prev => ({
                  ...prev,
                  seconds: intervalLen - intervalElapsed,
                  emomCurrentRound: newRound,
                  startedAt: newStartedAt,
                }));
                updateLiveActivity(
                  'emom',
                  newStartedAt,
                  newStartedAt + intervalLen * 1000,
                  false,
                  {
                    emomCurrentRound: newRound,
                    emomTotalRounds: timer.emomTotalRounds,
                  }
                );
              }
            } else {
              // Countdown mode
              const remaining = timer.targetSeconds - elapsed;
              if (remaining <= 0) {
                // Timer finished while in background
                playCompletionFeedback();
                setTimerFinished(timer.activityName);
                cancelTimerNotification();
                endLiveActivity();
                setTimer(prev => ({
                  ...prev,
                  seconds: 0,
                  isRunning: false,
                  startedAt: null,
                }));
              } else {
                setTimer(prev => ({ ...prev, seconds: remaining }));
              }
            }
          }
        }
        appStateRef.current = nextAppState;
      }
    );

    return () => subscription.remove();
  }, [
    timer.isRunning,
    timer.startedAt,
    timer.mode,
    timer.targetSeconds,
    timer.emomIntervalSeconds,
    timer.emomTotalRounds,
    timer.emomCurrentRound,
    playCompletionFeedback,
    cancelTimerNotification,
    endLiveActivity,
    updateLiveActivity,
  ]);

  // Manage the interval for foreground counting
  useEffect(() => {
    if (timer.isRunning && appStateRef.current === 'active') {
      intervalRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev.mode === 'countUp') {
            if (prev.startedAt === null) return prev;
            const seconds = Math.max(0, Math.floor((Date.now() - prev.startedAt) / 1000));
            return seconds === prev.seconds ? prev : { ...prev, seconds };
          } else if (prev.mode === 'emom') {
            if (prev.seconds <= 1) {
              const isLastRound = prev.emomCurrentRound >= prev.emomTotalRounds;
              if (isLastRound) {
                playCompletionFeedback();
                finishAlertRef.current = prev.activityName;
                cancelTimerNotification();
                endLiveActivity();
                return {
                  ...prev,
                  seconds: 0,
                  isRunning: false,
                  startedAt: null,
                  emomCurrentRound: 0,
                };
              }
              // Advance to next round — one-shot ding only
              playIntervalFeedback();
              const nextStartedAt = Date.now();
              const nextRound = prev.emomCurrentRound + 1;
              updateLiveActivity(
                'emom',
                nextStartedAt,
                nextStartedAt + prev.emomIntervalSeconds * 1000,
                false,
                {
                  emomCurrentRound: nextRound,
                  emomTotalRounds: prev.emomTotalRounds,
                }
              );
              return {
                ...prev,
                seconds: prev.emomIntervalSeconds,
                emomCurrentRound: nextRound,
                startedAt: nextStartedAt,
              };
            }
            return { ...prev, seconds: prev.seconds - 1 };
          } else {
            // Countdown mode
            const remaining = prev.startedAt === null
              ? Math.max(0, prev.seconds - 1)
              : Math.max(0, prev.targetSeconds - Math.floor((Date.now() - prev.startedAt) / 1000));
            if (remaining === 0) {
              // Timer finished
              playCompletionFeedback();
              finishAlertRef.current = prev.activityName;
              cancelTimerNotification();
              endLiveActivity();
              return {
                ...prev,
                seconds: 0,
                isRunning: false,
                startedAt: null,
              };
            }
            return remaining === prev.seconds ? prev : { ...prev, seconds: remaining };
          }
        });
      }, timer.mode === 'emom' ? 1000 : 50);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timer.isRunning, timer.mode]);

  const initialSecondsForMode = (prev: TimerState): number => {
    if (prev.mode === 'countDown') return prev.targetSeconds;
    if (prev.mode === 'emom') return prev.emomIntervalSeconds;
    return 0;
  };

  const startTimer = useCallback(
    (activityId: string, activityName: string): boolean => {
      // Check if another timer is already running
      if (timer.isRunning && timer.activityId !== activityId) {
        return false;
      }

      // If this activity's timer is already running, do nothing
      if (timer.isRunning && timer.activityId === activityId) {
        return true;
      }

      // EMOM needs a non-zero interval and at least 1 round to be meaningful.
      if (
        timer.mode === 'emom' &&
        (timer.emomIntervalSeconds <= 0 || timer.emomTotalRounds <= 0)
      ) {
        return false;
      }

      const now = Date.now();
      setTimer(prev => ({
        ...prev,
        activityId,
        activityName,
        seconds: initialSecondsForMode(prev),
        isRunning: true,
        startedAt: now,
        emomCurrentRound: prev.mode === 'emom' ? 1 : prev.emomCurrentRound,
      }));

      // Schedule background-safe notification for modes with a finite end time
      if (timer.mode === 'countDown' && timer.targetSeconds > 0) {
        scheduleTimerNotification(
          activityName,
          now + timer.targetSeconds * 1000
        );
        startLiveActivity(
          activityId,
          activityName,
          'countDown',
          now,
          now + timer.targetSeconds * 1000
        );
      } else if (
        timer.mode === 'emom' &&
        timer.emomIntervalSeconds > 0 &&
        timer.emomTotalRounds > 0
      ) {
        scheduleTimerNotification(
          activityName,
          now + timer.emomIntervalSeconds * timer.emomTotalRounds * 1000
        );
        startLiveActivity(
          activityId,
          activityName,
          'emom',
          now,
          now + timer.emomIntervalSeconds * 1000,
          { emomCurrentRound: 1, emomTotalRounds: timer.emomTotalRounds }
        );
      } else if (timer.mode === 'countUp') {
        startLiveActivity(activityId, activityName, 'countUp', now, null);
      }
      return true;
    },
    [
      timer.isRunning,
      timer.activityId,
      timer.mode,
      timer.emomIntervalSeconds,
      timer.emomTotalRounds,
      timer.targetSeconds,
      scheduleTimerNotification,
      startLiveActivity,
    ]
  );

  const switchTimer = useCallback(
    (activityId: string, activityName: string): void => {
      // Force switch to a new activity, stopping any existing timer
      const now = Date.now();
      endLiveActivityImmediate();
      setTimer(prev => {
        const emomReady =
          prev.mode === 'emom' &&
          prev.emomIntervalSeconds > 0 &&
          prev.emomTotalRounds > 0;
        const nextStartedAt = prev.mode === 'emom' && !emomReady ? null : now;
        const nextRunning = prev.mode === 'emom' ? emomReady : true;
        const nextRound = emomReady ? 1 : prev.emomCurrentRound;

        if (nextRunning && nextStartedAt !== null) {
          if (prev.mode === 'countDown' && prev.targetSeconds > 0) {
            startLiveActivity(
              activityId,
              activityName,
              'countDown',
              nextStartedAt,
              nextStartedAt + prev.targetSeconds * 1000
            );
          } else if (emomReady) {
            startLiveActivity(
              activityId,
              activityName,
              'emom',
              nextStartedAt,
              nextStartedAt + prev.emomIntervalSeconds * 1000,
              {
                emomCurrentRound: 1,
                emomTotalRounds: prev.emomTotalRounds,
              }
            );
          } else if (prev.mode === 'countUp') {
            startLiveActivity(
              activityId,
              activityName,
              'countUp',
              nextStartedAt,
              null
            );
          }
        }

        return {
          ...prev,
          activityId,
          activityName,
          seconds: initialSecondsForMode(prev),
          isRunning: nextRunning,
          startedAt: nextStartedAt,
          emomCurrentRound: nextRound,
        };
      });
    },
    [endLiveActivityImmediate, startLiveActivity]
  );

  const pauseTimer = useCallback(() => {
    setTimer(prev => {
      // Update Live Activity with frozen remaining/elapsed view.
      const freezeStartedAt = Date.now();
      const mode: LiveActivityMode =
        prev.mode === 'countDown'
          ? 'countDown'
          : prev.mode === 'emom'
            ? 'emom'
            : 'countUp';
      let endsAt: number | null = null;
      if (prev.mode === 'countDown') {
        endsAt = freezeStartedAt + prev.seconds * 1000;
      } else if (prev.mode === 'emom') {
        endsAt = freezeStartedAt + prev.seconds * 1000;
      }
      updateLiveActivity(mode, freezeStartedAt, endsAt, true, {
        emomCurrentRound:
          prev.mode === 'emom' ? prev.emomCurrentRound : undefined,
        emomTotalRounds:
          prev.mode === 'emom' ? prev.emomTotalRounds : undefined,
      });
      return {
        ...prev,
        isRunning: false,
        startedAt: null,
      };
    });
    cancelTimerNotification();
  }, [cancelTimerNotification, updateLiveActivity]);

  const resumeTimer = useCallback(() => {
    if (timer.activityId) {
      const now = Date.now();
      // For countdown/emom, startedAt represents when we started counting from
      // the full interval. We compute elapsed-before-pause within the current
      // interval (EMOM) or across the full countdown (countDown).
      let elapsedBeforePause: number;
      if (timer.mode === 'countDown') {
        elapsedBeforePause = timer.targetSeconds - timer.seconds;
      } else if (timer.mode === 'emom') {
        elapsedBeforePause = timer.emomIntervalSeconds - timer.seconds;
      } else {
        elapsedBeforePause = timer.seconds;
        countUpOffset.current = timer.seconds;
      }
      const newStartedAt = now - elapsedBeforePause * 1000;
      setTimer(prev => ({
        ...prev,
        isRunning: true,
        startedAt: newStartedAt,
      }));

      if (timer.mode === 'countDown') {
        scheduleTimerNotification(
          timer.activityName,
          now + timer.seconds * 1000
        );
        updateLiveActivity(
          'countDown',
          newStartedAt,
          now + timer.seconds * 1000,
          false
        );
      } else if (timer.mode === 'emom') {
        const remainingRoundsSeconds =
          timer.seconds +
          Math.max(0, timer.emomTotalRounds - timer.emomCurrentRound) *
            timer.emomIntervalSeconds;
        scheduleTimerNotification(
          timer.activityName,
          now + remainingRoundsSeconds * 1000
        );
        updateLiveActivity(
          'emom',
          newStartedAt,
          now + timer.seconds * 1000,
          false,
          {
            emomCurrentRound: timer.emomCurrentRound,
            emomTotalRounds: timer.emomTotalRounds,
          }
        );
      } else {
        updateLiveActivity('countUp', newStartedAt, null, false);
      }
    }
  }, [
    timer.activityId,
    timer.activityName,
    timer.seconds,
    timer.mode,
    timer.targetSeconds,
    timer.emomIntervalSeconds,
    timer.emomTotalRounds,
    timer.emomCurrentRound,
    scheduleTimerNotification,
    updateLiveActivity,
  ]);

  const resetTimer = useCallback(() => {
    setTimer(prev => ({
      ...prev,
      seconds:
        prev.mode === 'countDown'
          ? prev.targetSeconds
          : prev.mode === 'emom'
            ? prev.emomIntervalSeconds
            : 0,
      isRunning: false,
      startedAt: null,
      emomCurrentRound: prev.mode === 'emom' ? 0 : prev.emomCurrentRound,
    }));
    cancelTimerNotification();
    endLiveActivity();
  }, [cancelTimerNotification, endLiveActivity]);

  const stopTimer = useCallback(() => {
    setTimer(prev => ({
      ...initialState,
      mode: prev.mode,
      targetSeconds: prev.targetSeconds,
      emomIntervalSeconds: prev.emomIntervalSeconds,
      emomTotalRounds: prev.emomTotalRounds,
    }));
    cancelTimerNotification();
    endLiveActivity();
  }, [cancelTimerNotification, endLiveActivity]);

  const setTimerMode = useCallback((mode: TimerMode) => {
    setTimer(prev => ({
      ...prev,
      mode,
      seconds:
        mode === 'countDown'
          ? prev.targetSeconds
          : mode === 'emom'
            ? prev.emomIntervalSeconds
            : 0,
      isRunning: false,
      startedAt: null,
      emomCurrentRound: 0,
    }));
  }, []);

  const setTargetSeconds = useCallback((seconds: number) => {
    setTimer(prev => ({
      ...prev,
      targetSeconds: seconds,
      seconds:
        prev.mode === 'countDown' && !prev.isRunning ? seconds : prev.seconds,
    }));
  }, []);

  const setEmomInterval = useCallback((seconds: number) => {
    const next = Math.max(0, seconds);
    setTimer(prev => ({
      ...prev,
      emomIntervalSeconds: next,
      seconds: prev.mode === 'emom' && !prev.isRunning ? next : prev.seconds,
    }));
  }, []);

  const setEmomRounds = useCallback((rounds: number) => {
    const next = Math.max(0, Math.floor(rounds));
    setTimer(prev => ({
      ...prev,
      emomTotalRounds: next,
    }));
  }, []);

  const startCountdown = useCallback(
    (activityId: string, activityName: string, seconds: number): void => {
      const now = Date.now();
      setTimer(prev => ({
        ...prev,
        activityId,
        activityName,
        seconds,
        isRunning: true,
        startedAt: now,
        mode: 'countDown',
        targetSeconds: seconds,
        emomCurrentRound: 0,
      }));
      if (seconds > 0) {
        scheduleTimerNotification(
          activityName,
          now + seconds * 1000,
          'rest-timer'
        );
        // startCountdown is the auto-rest entry point — tag as 'rest' so the
        // island renders the amber rest styling.
        endLiveActivityImmediate();
        startLiveActivity(
          activityId,
          activityName,
          'rest',
          now,
          now + seconds * 1000
        );
      }
    },
    [scheduleTimerNotification, endLiveActivityImmediate, startLiveActivity]
  );

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const value: TimerContextValue = {
    timer,
    startTimer,
    switchTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    stopTimer,
    setTimerMode,
    setTargetSeconds,
    setEmomInterval,
    setEmomRounds,
    startCountdown,
    formatTime,
  };

  const latest = useRef(value);
  latest.current = value;
  const actions = useMemo<TimerActions>(
    () => ({
      startTimer: (...args) => latest.current.startTimer(...args),
      switchTimer: (...args) => latest.current.switchTimer(...args),
      pauseTimer: (...args) => latest.current.pauseTimer(...args),
      resumeTimer: (...args) => latest.current.resumeTimer(...args),
      resetTimer: (...args) => latest.current.resetTimer(...args),
      stopTimer: (...args) => latest.current.stopTimer(...args),
      setTimerMode: (...args) => latest.current.setTimerMode(...args),
      setTargetSeconds: (...args) => latest.current.setTargetSeconds(...args),
      setEmomInterval: (...args) => latest.current.setEmomInterval(...args),
      setEmomRounds: (...args) => latest.current.setEmomRounds(...args),
      startCountdown: (...args) => latest.current.startCountdown(...args),
      formatTime: (...args) => latest.current.formatTime(...args),
      getTimerState: () => latest.current.timer,
    }),
    []
  );
  const metadata = useMemo<TimerMetadata>(() => {
    const { seconds, ...rest } = timer;
    return { ...rest, hasTimeRemaining: seconds > 0 };
  }, [
    timer.activityId,
    timer.activityName,
    timer.isRunning,
    timer.startedAt,
    timer.mode,
    timer.targetSeconds,
    timer.emomIntervalSeconds,
    timer.emomTotalRounds,
    timer.emomCurrentRound,
    timer.seconds > 0,
  ]);
  return (
    <TimerActionsContext.Provider value={actions}>
      <TimerMetadataContext.Provider value={metadata}>
        <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
      </TimerMetadataContext.Provider>
    </TimerActionsContext.Provider>
  );
}

export function useTimer(): TimerContextValue {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}

export function useTimerActions(): TimerActions {
  const value = useContext(TimerActionsContext);
  if (!value) throw new Error('TimerProvider is required');
  return value;
}
export function useTimerMetadata(): TimerMetadata {
  const value = useContext(TimerMetadataContext);
  if (!value) throw new Error('TimerProvider is required');
  return value;
}
