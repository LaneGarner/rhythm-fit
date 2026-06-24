import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { isBackendConfigured } from '../config/api';
import {
  fetchPreferences,
  updatePreferences,
} from '../services/preferencesService';
import { CoachProfile } from '../types/coachProfile';
import {
  loadCoachProfile,
  loadOnboardingCompleted,
  loadOnboardingDeferred,
  saveCoachProfile,
  saveOnboardingCompleted,
  saveOnboardingDeferred,
} from '../utils/storage';
import { useAuth } from './AuthContext';

interface CoachProfileContextProps {
  coachProfile: CoachProfile | null;
  hasCompletedOnboarding: boolean;
  onboardingDeferred: boolean;
  isLoading: boolean;
  setCoachProfile: (profile: CoachProfile | null) => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
  deferOnboarding: () => Promise<void>;
}

export const CoachProfileContext = createContext<CoachProfileContextProps>({
  coachProfile: null,
  hasCompletedOnboarding: false,
  onboardingDeferred: false,
  isLoading: true,
  setCoachProfile: async () => {},
  markOnboardingComplete: async () => {},
  deferOnboarding: async () => {},
});

export const CoachProfileProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [coachProfile, setCoachProfileState] = useState<CoachProfile | null>(
    null
  );
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [onboardingDeferred, setOnboardingDeferred] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, getAccessToken, isLoading: authLoading } = useAuth();

  const isAuthenticated = Boolean(user) && isBackendConfigured();

  // Load on mount and when auth state changes: local-first, then let the server
  // override if authed, else push local up if the server has nothing.
  useEffect(() => {
    const load = async () => {
      if (authLoading) {
        return;
      }

      setIsLoading(true);

      const localProfile = await loadCoachProfile();
      const localCompleted = await loadOnboardingCompleted();
      const localDeferred = await loadOnboardingDeferred();
      setCoachProfileState(localProfile);
      setHasCompletedOnboarding(localCompleted);
      setOnboardingDeferred(localDeferred);

      if (isAuthenticated) {
        const token = getAccessToken();
        if (token) {
          const serverPrefs = await fetchPreferences(token);
          if (serverPrefs) {
            setCoachProfileState(serverPrefs.coachProfile);
            setHasCompletedOnboarding(serverPrefs.hasCompletedOnboarding);
            await saveCoachProfile(serverPrefs.coachProfile);
            await saveOnboardingCompleted(serverPrefs.hasCompletedOnboarding);

            // Server is empty but we have local onboarding data → push it up.
            if (
              !serverPrefs.hasCompletedOnboarding &&
              (localCompleted || localProfile)
            ) {
              await updatePreferences(token, {
                coachProfile: localProfile,
                hasCompletedOnboarding: localCompleted,
              });
              setCoachProfileState(localProfile);
              setHasCompletedOnboarding(localCompleted);
            }
          }
        }
      }

      setIsLoading(false);
    };

    load();
  }, [isAuthenticated, authLoading, getAccessToken]);

  const handleSetCoachProfile = useCallback(
    async (profile: CoachProfile | null) => {
      setCoachProfileState(profile);
      await saveCoachProfile(profile);

      if (isAuthenticated) {
        const token = getAccessToken();
        if (token) {
          await updatePreferences(token, { coachProfile: profile });
        }
      }
    },
    [isAuthenticated, getAccessToken]
  );

  const markOnboardingComplete = useCallback(async () => {
    setHasCompletedOnboarding(true);
    await saveOnboardingCompleted(true);

    if (isAuthenticated) {
      const token = getAccessToken();
      if (token) {
        await updatePreferences(token, { hasCompletedOnboarding: true });
      }
    }
  }, [isAuthenticated, getAccessToken]);

  const deferOnboarding = useCallback(async () => {
    setOnboardingDeferred(true);
    await saveOnboardingDeferred(true);
  }, []);

  return (
    <CoachProfileContext.Provider
      value={{
        coachProfile,
        hasCompletedOnboarding,
        onboardingDeferred,
        isLoading,
        setCoachProfile: handleSetCoachProfile,
        markOnboardingComplete,
        deferOnboarding,
      }}
    >
      {children}
    </CoachProfileContext.Provider>
  );
};

export const useCoachProfile = () => useContext(CoachProfileContext);
