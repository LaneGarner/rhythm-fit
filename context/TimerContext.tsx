import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { Alert, AppState, AppStateStatus, Vibration } from 'react-native';

type TimerMode = 'countUp' | 'countDown';

interface TimerState {
  activityId: string | null;
  activityName: string;
  seconds: number;
  isRunning: boolean;
  startedAt: number | null;
  mode: TimerMode;
  targetSeconds: number; // For countdown mode
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
};

const TimerContext = createContext<TimerContextValue | undefined>(undefined);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timer, setTimer] = useState<TimerState>(initialState);
  const [timerFinished, setTimerFinished] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const finishAlertRef = useRef<string | null>(null);

  // Show alert when countdown finishes
  useEffect(() => {
    if (timerFinished) {
      Alert.alert(
        'Timer Complete',
        `Your timer for "${timerFinished}" has finished!`,
        [{ text: 'OK', onPress: () => setTimerFinished(null) }]
      );
    }
  }, [timerFinished]);

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
            } else {
              // Countdown mode
              const remaining = timer.targetSeconds - elapsed;
              if (remaining <= 0) {
                // Timer finished while in background
                Vibration.vibrate([0, 500, 200, 500]);
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
  }, [timer.isRunning, timer.startedAt, timer.mode, timer.targetSeconds]);

  // Manage the interval for foreground counting
  useEffect(() => {
    if (timer.isRunning && appStateRef.current === 'active') {
      intervalRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev.mode === 'countUp') {
            return { ...prev, seconds: prev.seconds + 1 };
          } else {
            // Countdown mode
            if (prev.seconds <= 1) {
              // Timer finished
              Vibration.vibrate([0, 500, 200, 500]);
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

      const now = Date.now();
      setTimer(prev => ({
        ...prev,
        activityId,
        activityName,
        seconds: prev.mode === 'countDown' ? prev.targetSeconds : 0,
        isRunning: true,
        startedAt: now,
      }));
      return true;
    },
    [timer.isRunning, timer.activityId]
  );

  const switchTimer = useCallback(
    (activityId: string, activityName: string): void => {
      // Force switch to a new activity, stopping any existing timer
      const now = Date.now();
      setTimer(prev => ({
        ...prev,
        activityId,
        activityName,
        seconds: prev.mode === 'countDown' ? prev.targetSeconds : 0,
        isRunning: true,
        startedAt: now,
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
      // For countdown, startedAt represents when we started counting from targetSeconds
      // We need to calculate based on how much time has already elapsed
      const elapsedBeforePause =
        timer.mode === 'countDown'
          ? timer.targetSeconds - timer.seconds
          : timer.seconds;
      const newStartedAt = now - elapsedBeforePause * 1000;
      setTimer(prev => ({
        ...prev,
        isRunning: true,
        startedAt: newStartedAt,
      }));
    }
  }, [timer.activityId, timer.seconds, timer.mode, timer.targetSeconds]);

  const resetTimer = useCallback(() => {
    setTimer(prev => ({
      ...prev,
      seconds: prev.mode === 'countDown' ? prev.targetSeconds : 0,
      isRunning: false,
      startedAt: null,
    }));
  }, []);

  const stopTimer = useCallback(() => {
    setTimer(prev => ({
      ...initialState,
      mode: prev.mode,
      targetSeconds: prev.targetSeconds,
    }));
  }, []);

  const setTimerMode = useCallback((mode: TimerMode) => {
    setTimer(prev => ({
      ...prev,
      mode,
      seconds: mode === 'countDown' ? prev.targetSeconds : 0,
      isRunning: false,
      startedAt: null,
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
