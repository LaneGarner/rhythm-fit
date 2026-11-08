import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { useTimerActions, useTimerMetadata } from './TimerContext';
import { store } from '../redux/store';
import {
  nextSessionIndex,
  parseWorkoutSession,
  SessionItem,
  WorkoutSession,
} from '../utils/workoutSession';

interface SessionControls {
  session: WorkoutSession | null;
  ready: boolean;
  current: SessionItem | null;
  start: (date: string, items: SessionItem[]) => void;
  advance: () => SessionItem | null;
  end: () => void;
  startRest: (item: SessionItem, seconds: number) => void;
  skipRest: () => void;
  resume: () => SessionItem | null;
  activate: (id: string) => void;
}
const Context = createContext<SessionControls | null>(null);

export function WorkoutSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading: authLoading } = useAuth();
  const timer = useTimerMetadata();
  const { startCountdown, pauseTimer, stopTimer, getTimerState } =
    useTimerActions();
  const key = `rhythm_workout_session_v1:${user?.id || 'local'}`;
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const sessionRef = useRef<WorkoutSession | null>(null);
  const writes = useRef(Promise.resolve());
  const restoring = useRef(false);
  const timerActions = useRef({ startCountdown, pauseTimer });
  timerActions.current = { startCountdown, pauseTimer };
  const commit = useCallback(
    (next: WorkoutSession | null) => {
      sessionRef.current = next;
      setSession(next);
      writes.current = writes.current
        .catch(() => {})
        .then(() =>
          next
            ? AsyncStorage.setItem(key, JSON.stringify(next))
            : AsyncStorage.removeItem(key)
        )
        .catch(error =>
          console.error('Could not save workout session:', error)
        );
    },
    [key]
  );

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    setLoadedKey(null);
    sessionRef.current = null;
    setSession(null);
    (async () => {
      await writes.current;
      const saved = parseWorkoutSession(await AsyncStorage.getItem(key));
      if (!active) return;
      sessionRef.current = saved;
      setSession(saved);
      setLoadedKey(key);
      if (saved?.rest) {
        const remaining = saved.rest.endsAt
          ? Math.max(0, Math.ceil((saved.rest.endsAt - Date.now()) / 1000))
          : saved.rest.remaining;
        if (remaining > 0) {
          const item = saved.items[saved.index];
          restoring.current = true;
          timerActions.current.startCountdown(item.id, item.label, remaining);
          if (!saved.rest.endsAt) timerActions.current.pauseTimer();
        } else {
          commit({ ...saved, rest: undefined });
        }
      }
    })().catch(error => {
      console.error('Could not restore workout session:', error);
      if (active) setLoadedKey(key);
    });
    return () => {
      active = false;
    };
  }, [key, authLoading, commit]);

  // Keep a running deadline (or paused remainder) rather than persisting one
  // write per tick. Leaving the view never changes session position.
  useEffect(() => {
    if (loadedKey !== key) return;
    const value = sessionRef.current;
    if (!value?.rest) return;
    if (timer.activityId !== value.items[value.index]?.id) {
      if (!restoring.current) commit({ ...value, rest: undefined });
      return;
    }
    if (restoring.current) {
      restoring.current = false;
      return;
    }
    const seconds = getTimerState().seconds;
    const rest =
      timer.mode === 'countDown' && seconds > 0
        ? {
            remaining: seconds,
            ...(timer.isRunning ? { endsAt: Date.now() + seconds * 1000 } : {}),
          }
        : undefined;
    commit({ ...value, rest });
  }, [
    timer.isRunning,
    timer.startedAt,
    timer.activityId,
    timer.mode,
    loadedKey,
    key,
    commit,
  ]);

  // Editing an idle countdown changes the session's rest duration too. A
  // restored remainder or a finished countdown must not shorten future rests.
  useEffect(() => {
    const value = sessionRef.current;
    if (
      loadedKey !== key ||
      !value ||
      value.rest ||
      timer.isRunning ||
      timer.mode !== 'countDown'
    )
      return;
    const seconds = getTimerState().seconds;
    if (
      timer.targetSeconds > 0 &&
      seconds === timer.targetSeconds &&
      value.restDuration !== timer.targetSeconds
    )
      commit({ ...value, restDuration: timer.targetSeconds });
  }, [
    timer.targetSeconds,
    timer.isRunning,
    timer.mode,
    loadedKey,
    key,
    commit,
    getTimerState,
  ]);

  const start = (date: string, items: SessionItem[]) => {
    if (loadedKey !== key || !items.length) return;
    if (
      timer.activityId ===
      sessionRef.current?.items[sessionRef.current.index]?.id
    )
      stopTimer();
    commit({
      version: 1,
      date,
      items,
      index: 0,
      restDuration: timer.targetSeconds > 0 ? timer.targetSeconds : 120,
    });
  };
  const goToNext = (includeCurrent = false) => {
    const value = sessionRef.current;
    if (!value) return null;
    const index = nextSessionIndex(
      value,
      store.getState().activities.data,
      value.index + (includeCurrent ? 0 : 1)
    );
    if (index < 0) {
      commit(null);
      if (timer.activityId === value.items[value.index]?.id) stopTimer();
      return null;
    }
    if (includeCurrent && index === value.index) return value.items[index];
    if (timer.activityId === value.items[value.index]?.id) stopTimer();
    commit({ ...value, index, rest: undefined });
    return value.items[index];
  };
  const activate = (id: string) => {
    const value = sessionRef.current;
    if (!value) return;
    const index = value.items.findIndex(item => item.id === id);
    if (index < 0 || index === value.index) return;
    if (timer.activityId === value.items[value.index]?.id) stopTimer();
    commit({ ...value, index, rest: undefined });
  };
  const advance = () => goToNext();
  const resume = () => goToNext(true);
  const skipRest = () => {
    const value = sessionRef.current;
    if (value) commit({ ...value, rest: undefined });
    if (timer.activityId === value?.items[value.index]?.id) stopTimer();
  };
  const end = () => {
    if (
      timer.activityId ===
      sessionRef.current?.items[sessionRef.current.index]?.id
    )
      stopTimer();
    commit(null);
  };
  const startRest = (item: SessionItem, seconds: number) => {
    const value = sessionRef.current;
    if (!value) return;
    commit({
      ...value,
      rest: { remaining: seconds, endsAt: Date.now() + seconds * 1000 },
    });
    startCountdown(item.id, item.label, seconds);
  };
  const visible = loadedKey === key ? session : null;
  return (
    <Context.Provider
      value={{
        session: visible,
        ready: loadedKey === key,
        current: visible?.items[visible.index] || null,
        start,
        advance,
        end,
        startRest,
        skipRest,
        resume,
        activate,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useWorkoutSession() {
  const value = useContext(Context);
  if (!value) throw new Error('WorkoutSessionProvider is missing');
  return value;
}
