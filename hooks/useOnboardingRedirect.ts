import type { NavigationContainerRef } from '@react-navigation/native';
import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCoachProfile } from '../context/CoachProfileContext';
import { useEntitlements } from '../context/EntitlementContext';
import type { RootStackParamList } from '../App';

/**
 * After login, nudge a signed-in user who hasn't onboarded to the Coach so they
 * can build their first plan. Fires once per session. Anonymous/local-only users
 * are never redirected — that guard is load-bearing for local-only mode.
 */
export function useOnboardingRedirect(
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>
) {
  const { user, isLoading: authLoading } = useAuth();
  const {
    hasCompletedOnboarding,
    onboardingDeferred,
    isLoading: profileLoading,
  } = useCoachProfile();
  const { hasCoachAccess } = useEntitlements();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    // Anonymous safety: no user → never force onboarding.
    if (!user) return;
    // Wait for both auth and profile to settle, or we may flash onboarding at
    // an already-onboarded user.
    if (authLoading || profileLoading) return;
    // Route through the same gate as the rest of the Coach.
    if (!hasCoachAccess) return;
    // Already done, or the user said "maybe later".
    if (hasCompletedOnboarding || onboardingDeferred) return;

    firedRef.current = true;
    navigationRef.current?.navigate('Main', {
      screen: 'Coach',
      params: { startOnboarding: true },
    } as never);
  }, [
    user,
    authLoading,
    profileLoading,
    hasCoachAccess,
    hasCompletedOnboarding,
    onboardingDeferred,
    navigationRef,
  ]);
}
