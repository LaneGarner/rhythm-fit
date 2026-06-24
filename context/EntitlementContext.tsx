import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';

// Single source of truth for whether the user can access the Coach (premium)
// section. Today this is a sign-in gate. Later, swap `hasCoachAccess` to a
// subscription check (RevenueCat / profiles.subscription_tier) with zero
// call-site changes — CoachGate and the onboarding redirect both read this.
interface EntitlementContextProps {
  hasCoachAccess: boolean;
}

export const EntitlementContext = createContext<EntitlementContextProps>({
  hasCoachAccess: false,
});

export const EntitlementProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();

  const value = useMemo<EntitlementContextProps>(
    () => ({
      // Sign-in gate for now: signed-in users have access.
      hasCoachAccess: Boolean(user),
    }),
    [user]
  );

  return (
    <EntitlementContext.Provider value={value}>
      {children}
    </EntitlementContext.Provider>
  );
};

export const useEntitlements = () => useContext(EntitlementContext);
