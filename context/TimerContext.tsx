import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { Alert, AppState, AppStateStatus, Vibration } from 'react-native';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { usePreferences } from './PreferencesContext';

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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const finishAlertRef = useRef<string | null>(null);
  const { timerVibration, timerSound } = usePreferences();
  const timerVibrationRef = useRef(timerVibration);
  const timerSoundRef = useRef(timerSound);
  const player = useAudioPlayer(require('../assets/sounds/timer-complete.wav'));

  // Configure audio to play even when iOS silent switch is on
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  // Keep refs in sync with preference values (refs needed inside setInterval callback)
  useEffect(() => {
    timerVibrationRef.current = timerVibration;
  }, [timerVibration]);

  useEffect(() => {
    timerSoundRef.current = timerSound;
  }, [timerSound]);

  const vibrationActiveRef = useRef(false);
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const playVibrationPattern = useCallback(async () => {
    if (!vibrationActiveRef.current) return;
    // Pattern: BUZZ tap tap [wait] BUZZ tap tap tap
    if (timerSoundRef.current) {
      player.seekTo(0);
      player.play();
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
  }, []);

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
  }, [playVibrationPattern, player]);

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
                setTimer(prev => ({
                  ...prev,
                  seconds: 0,
                  isRunning: false,
                  startedAt: null,
                  emomCurrentRound: 0,
                }));
              } else {
                setTimer(prev => ({
                  ...prev,
                  seconds: intervalLen - intervalElapsed,
                  emomCurrentRound: newRound,
                  startedAt: now - intervalElapsed * 1000,
                }));
              }
            } else {
              // Countdown mode
              const remaining = timer.targetSeconds - elapsed;
              if (remaining <= 0) {
                // Timer finished while in background
                playCompletionFeedback();
                setTimerFinished(timer.activityName);
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
  ]);

  // Manage the interval for foreground counting
  useEffect(() => {
    if (timer.isRunning && appStateRef.current === 'active') {
      intervalRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev.mode === 'countUp') {
            return { ...prev, seconds: prev.seconds + 1 };
          } else if (prev.mode === 'emom') {
            if (prev.seconds <= 1) {
              const isLastRound =
                prev.emomCurrentRound >= prev.emomTotalRounds;
              if (isLastRound) {
                playCompletionFeedback();
                finishAlertRef.current = prev.activityName;
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
              return {
                ...prev,
                seconds: prev.emomIntervalSeconds,
                emomCurrentRound: prev.emomCurrentRound + 1,
                startedAt: Date.now(),
              };
            }
            return { ...prev, seconds: prev.seconds - 1 };
          } else {
            // Countdown mode
            if (prev.seconds <= 1) {
              // Timer finished
              playCompletionFeedback();
              finishAlertRef.current = prev.activityName;
              return {
                ...prev,
                seconds: 0,
                isRunning: false,
                startedAt: null,
              };
            }
            return { ...prev, seconds: prev.seconds - 1 };
          }
        });
      }, 1000);
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
  }, [timer.isRunning]);

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
      return true;
    },
    [
      timer.isRunning,
      timer.activityId,
      timer.mode,
      timer.emomIntervalSeconds,
      timer.emomTotalRounds,
    ]
  );

  const switchTimer = useCallback(
    (activityId: string, activityName: string): void => {
      // Force switch to a new activity, stopping any existing timer
      const now = Date.now();
      setTimer(prev => ({
        ...prev,
        activityId,
        activityName,
        seconds: initialSecondsForMode(prev),
        isRunning: prev.mode === 'emom'
          ? prev.emomIntervalSeconds > 0 && prev.emomTotalRounds > 0
          : true,
        startedAt:
          prev.mode === 'emom' &&
          (prev.emomIntervalSeconds <= 0 || prev.emomTotalRounds <= 0)
            ? null
            : now,
        emomCurrentRound:
          prev.mode === 'emom' && prev.emomIntervalSeconds > 0 && prev.emomTotalRounds > 0
            ? 1
            : prev.emomCurrentRound,
      }));
    },
    []
  );

  const pauseTimer = useCallback(() => {
    setTimer(prev => ({
      ...prev,
      isRunning: false,
      startedAt: null,
    }));
  }, []);

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
      }
      const newStartedAt = now - elapsedBeforePause * 1000;
      setTimer(prev => ({
        ...prev,
        isRunning: true,
        startedAt: newStartedAt,
      }));
    }
  }, [
    timer.activityId,
    timer.seconds,
    timer.mode,
    timer.targetSeconds,
    timer.emomIntervalSeconds,
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
  }, []);

  const stopTimer = useCallback(() => {
    setTimer(prev => ({
      ...initialState,
      mode: prev.mode,
      targetSeconds: prev.targetSeconds,
      emomIntervalSeconds: prev.emomIntervalSeconds,
      emomTotalRounds: prev.emomTotalRounds,
    }));
  }, []);

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
      setTimer(prev => ({
        ...prev,
        activityId,
        activityName,
        seconds,
        isRunning: true,
        startedAt: Date.now(),
        mode: 'countDown',
        targetSeconds: seconds,
        emomCurrentRound: 0,
      }));
    },
    []
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

  return (
    <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
  );
}

export function useTimer(): TimerContextValue {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}
