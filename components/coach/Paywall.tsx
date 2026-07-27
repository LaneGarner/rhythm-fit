import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useEntitlements } from '../../context/EntitlementContext';
import {
  getCoachPackages,
  getCurrentOffering,
  hasCoachEntitlement,
  isPurchasesAvailable,
  purchaseCoachPackage,
  restorePurchases,
} from '../../services/purchases';
import {
  MANAGE_SUBSCRIPTIONS_URL,
  PRIVACY_POLICY_URL,
  TERMS_OF_USE_URL,
} from '../../services/legalLinks';
import { useTheme } from '../../theme/ThemeContext';
import type { PurchasesPackage } from 'react-native-purchases';

const BENEFITS = [
  'Personalized multi-week training plans',
  'Coach tips based on your workouts',
  'Reschedule and adapt on the fly',
  'Chat with your coach anytime',
];

// Shown to signed-in users without an active subscription or comp access.
// Sits behind CoachGate — refreshEntitlements() after purchase/restore/redeem
// flips the gate to the Coach with no navigation.
export default function Paywall() {
  const { colors } = useTheme();
  const { refreshEntitlements } = useEntitlements();

  const purchasesAvailable = isPurchasesAvailable();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoadingOffering, setIsLoadingOffering] =
    useState(purchasesAvailable);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadOffering = useCallback(async () => {
    if (!purchasesAvailable) return;
    setIsLoadingOffering(true);
    setError(null);
    setMessage(null);
    try {
      const offering = await getCurrentOffering();
      const available = getCoachPackages(offering);
      if (available.length === 0) {
        throw new Error('Coach products are missing from the current offering');
      }
      setPackages(available);
      // Default to annual (best value) when present.
      const annual = available.find(p => p.packageType === 'ANNUAL');
      setSelectedId((annual ?? available[0])?.identifier ?? null);
    } catch {
      setPackages([]);
      setSelectedId(null);
      setError('Subscriptions are temporarily unavailable. Please try again.');
    } finally {
      setIsLoadingOffering(false);
    }
  }, [purchasesAvailable]);

  useEffect(() => {
    loadOffering();
  }, [loadOffering]);

  const selectedPackage = packages.find(p => p.identifier === selectedId);
  const isStoreBusy = isPurchasing || isRestoring;

  const handlePurchase = async () => {
    if (!selectedPackage || isStoreBusy) return;
    setError(null);
    setMessage(null);
    setIsPurchasing(true);
    try {
      const customerInfo = await purchaseCoachPackage(selectedPackage);
      if (!customerInfo) return;
      if (!hasCoachEntitlement(customerInfo)) {
        setError(
          'The purchase completed, but Coach access has not updated. Please restore purchases.'
        );
        return;
      }
      try {
        await refreshEntitlements();
      } catch {
        setMessage(
          'Your purchase completed. If Coach access does not appear, restore purchases or reopen the app.'
        );
      }
    } catch {
      setError('The purchase could not be completed. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (isStoreBusy) return;
    setError(null);
    setMessage(null);
    setIsRestoring(true);
    try {
      const customerInfo = await restorePurchases();
      if (hasCoachEntitlement(customerInfo)) {
        try {
          await refreshEntitlements();
          setMessage('Your Coach subscription was restored.');
        } catch {
          setMessage(
            'Your subscription was restored. If Coach access does not appear, reopen the app.'
          );
        }
      } else {
        setMessage(
          'No active Coach subscription was found for this Apple Account.'
        );
      }
    } catch {
      setError('Restore failed. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const openLink = async (url: string) => {
    setError(null);
    try {
      await Linking.openURL(url);
    } catch {
      setError('This link could not be opened. Please try again.');
    }
  };

  const packageLabel = (pkg: PurchasesPackage) => {
    switch (pkg.packageType) {
      case 'ANNUAL':
        return 'Yearly';
      case 'MONTHLY':
        return 'Monthly';
      default:
        return pkg.product.title;
    }
  };

  const packageDetail = (pkg: PurchasesPackage) =>
    pkg.packageType === 'ANNUAL'
      ? `${pkg.product.priceString}/year · best value`
      : `${pkg.product.priceString}/month`;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 24 }}
        keyboardShouldPersistTaps="handled"
        accessibilityLabel="Coach subscription options"
      >
        <View
          style={{
            alignItems: 'center',
            padding: 28,
            borderRadius: 16,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: colors.primary.background,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Ionicons name="sparkles" size={24} color={colors.primary.main} />
          </View>
          <Text
            accessibilityRole="header"
            style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: '600',
              marginBottom: 6,
              textAlign: 'center',
            }}
          >
            Unlock your AI coach
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 14,
              lineHeight: 20,
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            Choose the plan that fits your training. Cancel anytime.
          </Text>

          <View style={{ alignSelf: 'stretch', marginBottom: 20 }}>
            {BENEFITS.map(benefit => (
              <View
                key={benefit}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={colors.primary.main}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{ color: colors.text, fontSize: 14, flexShrink: 1 }}
                >
                  {benefit}
                </Text>
              </View>
            ))}
          </View>

          {!purchasesAvailable ? (
            <View
              style={{
                alignSelf: 'stretch',
                padding: 14,
                borderRadius: 12,
                backgroundColor: colors.primary.background,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 13,
                  lineHeight: 18,
                  textAlign: 'center',
                }}
              >
                Subscriptions aren't available in this build. Install the App
                Store version to subscribe.
              </Text>
            </View>
          ) : isLoadingOffering ? (
            <ActivityIndicator
              color={colors.primary.main}
              style={{ marginBottom: 16 }}
              accessibilityLabel="Loading subscriptions"
            />
          ) : packages.length === 0 ? (
            <TouchableOpacity
              onPress={loadOffering}
              accessibilityRole="button"
              accessibilityLabel="Retry loading subscriptions"
              style={{
                minHeight: 48,
                paddingHorizontal: 18,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.primary.main,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={{ color: colors.primary.main, fontWeight: '600' }}>
                Retry
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={{ alignSelf: 'stretch', marginBottom: 16 }}>
                {packages.map(pkg => {
                  const selected = pkg.identifier === selectedId;
                  return (
                    <TouchableOpacity
                      key={pkg.identifier}
                      onPress={() => setSelectedId(pkg.identifier)}
                      disabled={isStoreBusy}
                      accessibilityRole="radio"
                      accessibilityState={{
                        selected,
                        disabled: isStoreBusy,
                      }}
                      accessibilityLabel={`${packageLabel(pkg)}, ${packageDetail(pkg)}`}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: selected
                          ? colors.primary.main
                          : colors.border,
                        backgroundColor: selected
                          ? colors.primary.background
                          : colors.background,
                        marginBottom: 10,
                        minHeight: 52,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 15,
                          fontWeight: '600',
                        }}
                      >
                        {packageLabel(pkg)}
                      </Text>
                      <Text
                        style={{ color: colors.textSecondary, fontSize: 14 }}
                      >
                        {packageDetail(pkg)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                onPress={handlePurchase}
                disabled={!selectedPackage || isStoreBusy}
                accessibilityRole="button"
                accessibilityLabel="Continue with selected subscription"
                accessibilityState={{
                  disabled: !selectedPackage || isStoreBusy,
                }}
                style={{
                  width: '100%',
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: colors.primary.main,
                  alignItems: 'center',
                  opacity: !selectedPackage || isStoreBusy ? 0.6 : 1,
                  minHeight: 48,
                  justifyContent: 'center',
                }}
              >
                {isPurchasing ? (
                  <ActivityIndicator
                    color={colors.textInverse}
                    accessibilityLabel="Completing purchase"
                  />
                ) : (
                  <Text
                    style={{
                      color: colors.textInverse,
                      fontSize: 16,
                      fontWeight: '600',
                    }}
                  >
                    Continue
                  </Text>
                )}
              </TouchableOpacity>

              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: 12,
                  lineHeight: 17,
                  textAlign: 'center',
                  marginTop: 12,
                }}
              >
                Payment is charged to your Apple Account at confirmation.
                Subscriptions renew automatically at the displayed price and
                period unless canceled at least 24 hours before the current
                period ends. Your Apple Account is charged for renewal within 24
                hours before that period ends.
              </Text>

              <TouchableOpacity
                onPress={handleRestore}
                disabled={isStoreBusy}
                accessibilityRole="button"
                accessibilityLabel="Restore purchases"
                hitSlop={14}
                style={{
                  marginTop: 14,
                  minHeight: 44,
                  justifyContent: 'center',
                }}
              >
                {isRestoring ? (
                  <ActivityIndicator
                    color={colors.primary.main}
                    accessibilityLabel="Restoring purchases"
                  />
                ) : (
                  <Text style={{ color: colors.primary.main, fontSize: 14 }}>
                    Restore purchases
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {error && (
            <Text
              accessibilityLiveRegion="polite"
              style={{
                color: colors.error.main,
                fontSize: 13,
                lineHeight: 18,
                textAlign: 'center',
                marginTop: 12,
              }}
            >
              {error}
            </Text>
          )}

          {message && (
            <Text
              accessibilityLiveRegion="polite"
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                lineHeight: 18,
                textAlign: 'center',
                marginTop: 12,
              }}
            >
              {message}
            </Text>
          )}

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginTop: 10,
            }}
          >
            {[
              ['Privacy Policy', PRIVACY_POLICY_URL],
              ['Terms of Use', TERMS_OF_USE_URL],
              ['Manage Subscription', MANAGE_SUBSCRIPTIONS_URL],
            ].map(([label, url]) => (
              <TouchableOpacity
                key={label}
                onPress={() => openLink(url)}
                accessibilityRole="link"
                accessibilityLabel={label}
                style={{
                  minHeight: 44,
                  paddingHorizontal: 8,
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: colors.primary.main, fontSize: 13 }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 13,
              lineHeight: 18,
              textAlign: 'center',
              marginTop: 14,
            }}
          >
            The rest of the app keeps working without a subscription.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
