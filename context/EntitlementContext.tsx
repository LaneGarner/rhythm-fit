import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { fetchCompAccess } from '../services/entitlementApi';
import {
  addCustomerInfoListener,
  getCustomerInfo,
  hasCoachEntitlement,
  isPurchasesAvailable,
  loginPurchases,
  logoutPurchases,
} from '../services/purchases';
import { useAuth } from './AuthContext';

// Single source of truth for whether the user can access the Coach (premium)
// section. Coach access requires being signed in AND either an active/trialing
// RevenueCat subscription or a redeemed comp code (profiles.comp_access).
// CoachGate and the onboarding redirect both read hasCoachAccess — the server
// independently enforces the same rule on /api/chat (402 when unentitled).
interface EntitlementContextProps {
  hasCoachAccess: boolean;
  isSignedIn: boolean;
  isSubscribed: boolean;
  hasCompAccess: boolean;
  // True while the first entitlement lookup for the current user is running —
  // lets CoachGate avoid flashing the paywall at already-subscribed users.
  isEntitlementLoading: boolean;
  // Re-check both RevenueCat and comp access (after purchase/restore/redeem).
  refreshEntitlements: () => Promise<void>;
}

export const EntitlementContext = createContext<EntitlementContextProps>({
  hasCoachAccess: false,
  isSignedIn: false,
  isSubscribed: false,
  hasCompAccess: false,
  isEntitlementLoading: false,
  refreshEntitlements: async () => {},
});

export const EntitlementProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [hasCompAccess, setHasCompAccess] = useState(false);
  const [isEntitlementLoading, setIsEntitlementLoading] = useState(false);

  const refreshEntitlements = useCallback(async () => {
    if (!user) {
      setIsSubscribed(false);
      setHasCompAccess(false);
      return;
    }
    const [customerInfo, compAccess] = await Promise.all([
      getCustomerInfo(),
      fetchCompAccess(user.id),
    ]);
    setIsSubscribed(hasCoachEntitlement(customerInfo));
    setHasCompAccess(compAccess);
  }, [user]);

  // On sign-in: identify the user to RevenueCat (app_user_id = Supabase user
  // id, so the webhook can sync status server-side) and load entitlements.
  // On sign-out: reset RevenueCat to anonymous and drop access.
  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setIsSubscribed(false);
      setHasCompAccess(false);
      setIsEntitlementLoading(false);
      logoutPurchases();
      return;
    }

    setIsEntitlementLoading(true);
    (async () => {
      const [customerInfo, compAccess] = await Promise.all([
        loginPurchases(user.id),
        fetchCompAccess(user.id),
      ]);
      if (cancelled) return;
      setIsSubscribed(hasCoachEntitlement(customerInfo));
      setHasCompAccess(compAccess);
      setIsEntitlementLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Keep subscription state current (renewals, expirations, purchases made on
  // another device). No-op in Expo Go.
  useEffect(() => {
    if (!user || !isPurchasesAvailable()) return;
    return addCustomerInfoListener(info => {
      setIsSubscribed(hasCoachEntitlement(info));
    });
  }, [user]);

  const value = useMemo<EntitlementContextProps>(
    () => ({
      hasCoachAccess: Boolean(user) && (isSubscribed || hasCompAccess),
      isSignedIn: Boolean(user),
      isSubscribed,
      hasCompAccess,
      isEntitlementLoading,
      refreshEntitlements,
    }),
    [
      user,
      isSubscribed,
      hasCompAccess,
      isEntitlementLoading,
      refreshEntitlements,
    ]
  );

  return (
    <EntitlementContext.Provider value={value}>
      {children}
    </EntitlementContext.Provider>
  );
};

export const useEntitlements = () => useContext(EntitlementContext);
