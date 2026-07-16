import React from 'react';
import { View } from 'react-native';
import { useEntitlements } from '../../context/EntitlementContext';
import { useTheme } from '../../theme/ThemeContext';
import Paywall from './Paywall';
import SignInPrompt from './SignInPrompt';

// Single premium boundary for the Coach section:
// - signed out            -> SignInPrompt
// - signed in, no access  -> Paywall (subscribe / restore / redeem a code)
// - entitled              -> the Coach
// Wrap every Coach surface in this. The backend enforces the same entitlement
// on /api/chat, so this gate is UX — not the security boundary.
export default function CoachGate({ children }: { children: React.ReactNode }) {
  const { hasCoachAccess, isSignedIn, isEntitlementLoading } =
    useEntitlements();
  const { colors } = useTheme();

  if (!isSignedIn) {
    return <SignInPrompt />;
  }
  if (!hasCoachAccess) {
    // Avoid flashing the paywall at subscribers while the first entitlement
    // lookup is in flight.
    if (isEntitlementLoading) {
      return <View style={{ flex: 1, backgroundColor: colors.background }} />;
    }
    return <Paywall />;
  }
  return <>{children}</>;
}
