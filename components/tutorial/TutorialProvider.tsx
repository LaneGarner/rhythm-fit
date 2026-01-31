import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BackHandler, LayoutRectangle } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { TUTORIAL_STEPS, TutorialStep } from './tutorialSteps';
import {
  loadTutorialCompleted,
  saveTutorialCompleted,
} from '../../utils/storage';
import SpotlightOverlay from './SpotlightOverlay';
import { useAuth } from '../../context/AuthContext';

interface TargetLayout extends LayoutRectangle {
  pageX: number;
  pageY: number;
}

interface TutorialContextValue {
  isActive: boolean;
  currentStep: TutorialStep | null;
  stepIndex: number;
  totalSteps: number;
  startTutorial: () => void;
  dismissTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  registerTarget: (targetId: string, layout: TargetLayout) => void;
  unregisterTarget: (targetId: string) => void;
}

const TutorialContext = createContext<TutorialContextValue>({
  isActive: false,
  currentStep: null,
  stepIndex: 0,
  totalSteps: TUTORIAL_STEPS.length,
  startTutorial: () => {},
  dismissTutorial: () => {},
  nextStep: () => {},
  prevStep: () => {},
  skipTutorial: () => {},
  registerTarget: () => {},
  unregisterTarget: () => {},
});

interface TutorialProviderProps {
  children: React.ReactNode;
  navigationRef: React.RefObject<NavigationContainerRef<any> | null>;
  shouldAutoStart?: boolean;
}

export function TutorialProvider({
  children,
  navigationRef,
  shouldAutoStart = false,
}: TutorialProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targets, setTargets] = useState<Map<string, TargetLayout>>(new Map());
  const [currentTargetLayout, setCurrentTargetLayout] =
    useState<TargetLayout | null>(null);
  const autoStartTriggeredRef = useRef(false);
  const navigationReadyRef = useRef(false);
  const { user } = useAuth();

  // Filter steps based on auth state
  const steps = useMemo(() => {
    return TUTORIAL_STEPS.filter(step => {
      if (step.requiresUnauthenticated && user) {
        return false;
      }
      return true;
    });
  }, [user]);

  const currentStep = isActive ? steps[stepIndex] || null : null;

  const registerTarget = useCallback(
    (targetId: string, layout: TargetLayout) => {
      setTargets(prev => {
        const next = new Map(prev);
        next.set(targetId, layout);
        return next;
      });
    },
    []
  );

  const unregisterTarget = useCallback((targetId: string) => {
    setTargets(prev => {
      const next = new Map(prev);
      next.delete(targetId);
      return next;
    });
  }, []);

  // Update current target layout when step changes or targets update
  useEffect(() => {
    if (currentStep) {
      const layout = targets.get(currentStep.targetId);
      setCurrentTargetLayout(layout || null);
    } else {
      setCurrentTargetLayout(null);
    }
  }, [currentStep, targets]);

  // Wait for target to be registered with polling
  const waitForTarget = useCallback(
    (
      targetId: string,
      timeoutMs: number = 1500
    ): Promise<TargetLayout | null> => {
      return new Promise(resolve => {
        const startTime = Date.now();
        const checkInterval = 50;

        const check = () => {
          const layout = targets.get(targetId);
          if (layout) {
            resolve(layout);
            return;
          }

          if (Date.now() - startTime >= timeoutMs) {
            resolve(null);
            return;
          }

          setTimeout(check, checkInterval);
        };

        check();
      });
    },
    [targets]
  );

  const navigateToStep = useCallback(
    async (step: TutorialStep) => {
      if (!step.navigateTo || !navigationRef.current) return;

      const nav = navigationRef.current as NavigationContainerRef<any>;

      if (step.navigateTo.type === 'tab') {
        nav.navigate('Main', { screen: step.navigateTo.screen });
      } else {
        nav.navigate(step.navigateTo.screen, step.navigateTo.params);
      }

      // Skip waiting for full-screen steps (no actual target to find)
      if (step.targetId === 'full-screen') return;

      // Wait for the target to be registered after navigation
      await waitForTarget(step.targetId, 1500);
    },
    [navigationRef, waitForTarget]
  );

  const advanceToStep = useCallback(
    async (newStepIndex: number) => {
      if (newStepIndex >= steps.length) {
        // Tutorial complete
        setIsActive(false);
        setStepIndex(0);
        await saveTutorialCompleted(true);
        return;
      }

      // Clear target layout immediately to hide spotlight ring during transition
      setCurrentTargetLayout(null);

      const step = steps[newStepIndex];
      await navigateToStep(step);
      setStepIndex(newStepIndex);
    },
    [navigateToStep, steps]
  );

  const startTutorial = useCallback(async () => {
    setStepIndex(0);
    setIsActive(true);

    // Navigate to first step
    const firstStep = steps[0];
    if (firstStep) {
      await navigateToStep(firstStep);
    }
  }, [navigateToStep, steps]);

  const dismissTutorial = useCallback(async () => {
    setIsActive(false);
    setStepIndex(0);
    await saveTutorialCompleted(true);
  }, []);

  const nextStep = useCallback(() => {
    advanceToStep(stepIndex + 1);
  }, [advanceToStep, stepIndex]);

  const prevStep = useCallback(() => {
    if (stepIndex > 0) {
      advanceToStep(stepIndex - 1);
    }
  }, [advanceToStep, stepIndex]);

  const skipTutorial = useCallback(async () => {
    setIsActive(false);
    setStepIndex(0);
    await saveTutorialCompleted(true);
  }, []);

  // Intercept back button/gesture during tutorial
  useEffect(() => {
    if (!isActive) return;

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (stepIndex > 0) {
          prevStep();
        }
        // Return true to prevent default back behavior
        return true;
      }
    );

    return () => backHandler.remove();
  }, [isActive, stepIndex, prevStep]);

  // Track navigation state to detect back navigation during tutorial
  const prevNavStateRef = useRef<any>(null);
  useEffect(() => {
    if (!isActive || !navigationRef.current) return;

    const unsubscribe = navigationRef.current.addListener('state', (e: any) => {
      const currentState = e.data.state;
      const prevState = prevNavStateRef.current;

      if (prevState && currentState) {
        // Check if stack got smaller (back navigation)
        const prevRoutes = prevState.routes || [];
        const currentRoutes = currentState.routes || [];

        if (currentRoutes.length < prevRoutes.length && stepIndex > 0) {
          // User swiped/navigated back - go to previous tutorial step
          prevStep();
        }
      }

      prevNavStateRef.current = currentState;
    });

    // Initialize with current state
    prevNavStateRef.current = navigationRef.current.getState();

    return unsubscribe;
  }, [isActive, stepIndex, prevStep, navigationRef]);

  // Handle auto-start on first launch
  useEffect(() => {
    if (
      shouldAutoStart &&
      !autoStartTriggeredRef.current &&
      navigationReadyRef.current
    ) {
      autoStartTriggeredRef.current = true;
      // Small delay to ensure everything is mounted
      const timer = setTimeout(() => {
        startTutorial();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoStart, startTutorial]);

  // Track when navigation is ready
  useEffect(() => {
    const checkNavReady = () => {
      if (navigationRef.current?.isReady()) {
        navigationReadyRef.current = true;
      } else {
        setTimeout(checkNavReady, 100);
      }
    };
    checkNavReady();
  }, [navigationRef]);

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        currentStep,
        stepIndex,
        totalSteps: steps.length,
        startTutorial,
        dismissTutorial,
        nextStep,
        prevStep,
        skipTutorial,
        registerTarget,
        unregisterTarget,
      }}
    >
      {children}
      {isActive && currentStep && (
        <SpotlightOverlay
          step={currentStep}
          stepIndex={stepIndex}
          totalSteps={steps.length}
          targetLayout={currentTargetLayout}
          onNext={nextStep}
          onBack={prevStep}
          onSkip={skipTutorial}
        />
      )}
    </TutorialContext.Provider>
  );
}

export const useTutorial = () => useContext(TutorialContext);
