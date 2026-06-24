import React from 'react';
import { useEntitlements } from '../../context/EntitlementContext';
import SignInPrompt from './SignInPrompt';

// Single premium boundary for the Coach section. Today it gates on sign-in via
// EntitlementContext; swapping that context to a subscription check turns this
// into a paywall with zero changes here. Wrap every Coach surface in this.
export default function CoachGate({ children }: { children: React.ReactNode }) {
  const { hasCoachAccess } = useEntitlements();
  if (!hasCoachAccess) {
    return <SignInPrompt />;
  }
  return <>{children}</>;
}
