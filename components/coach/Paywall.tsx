import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useEntitlements } from '../../context/EntitlementContext';
import { redeemCompCode } from '../../services/entitlementApi';
import {
  getCurrentOffering,
  isPurchasesAvailable,
  purchaseCoachPackage,
  restorePurchases,
} from '../../services/purchases';
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
  const { getAccessToken } = useAuth();
  const { refreshEntitlements } = useEntitlements();

  const purchasesAvailable = isPurchasesAvailable();
  const scrollRef = useRef<ScrollView>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoadingOffering, setIsLoadingOffering] =
    useState(purchasesAvailable);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);
  const [code, setCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!purchasesAvailable) return;
    let cancelled = false;
    (async () => {
      const offering = await getCurrentOffering();
      if (cancelled) return;
      const available = offering?.availablePackages ?? [];
      setPackages(available);
      // Default to annual (best value) when present.
      const annual = available.find(p => p.packageType === 'ANNUAL');
      setSelectedId((annual ?? available[0])?.identifier ?? null);
      setIsLoadingOffering(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [purchasesAvailable]);

  const selectedPackage = packages.find(p => p.identifier === selectedId);

  const handlePurchase = async () => {
    if (!selectedPackage || isPurchasing) return;
    setError(null);
    setIsPurchasing(true);
    try {
      const customerInfo = await purchaseCoachPackage(selectedPackage);
      if (customerInfo) {
        await refreshEntitlements();
      }
    } catch {
      setError(
        'Purchase failed. You have not been charged — please try again.'
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (isRestoring) return;
    setError(null);
    setIsRestoring(true);
    try {
      await restorePurchases();
      await refreshEntitlements();
    } catch {
      setError('Restore failed. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRedeem = async () => {
    const trimmed = code.trim();
    if (!trimmed || isRedeeming) return;
    setError(null);
    setIsRedeeming(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setError('Sign in again to redeem a code.');
        return;
      }
      await redeemCompCode(trimmed, token);
      await refreshEntitlements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not redeem code.');
    } finally {
      setIsRedeeming(false);
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
        ref={scrollRef}
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
            Start with a 7-day free trial. Cancel anytime.
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
                Store version to subscribe, or redeem an access code below.
              </Text>
            </View>
          ) : isLoadingOffering ? (
            <ActivityIndicator
              color={colors.primary.main}
              style={{ marginBottom: 16 }}
            />
          ) : (
            <>
              <View style={{ alignSelf: 'stretch', marginBottom: 16 }}>
                {packages.map(pkg => {
                  const selected = pkg.identifier === selectedId;
                  return (
                    <TouchableOpacity
                      key={pkg.identifier}
                      onPress={() => setSelectedId(pkg.identifier)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
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
                disabled={!selectedPackage || isPurchasing}
                accessibilityRole="button"
                accessibilityLabel="Start free trial"
                accessibilityState={{
                  disabled: !selectedPackage || isPurchasing,
                }}
                style={{
                  width: '100%',
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: colors.primary.main,
                  alignItems: 'center',
                  opacity: !selectedPackage || isPurchasing ? 0.6 : 1,
                  minHeight: 48,
                  justifyContent: 'center',
                }}
              >
                {isPurchasing ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <Text
                    style={{
                      color: colors.textInverse,
                      fontSize: 16,
                      fontWeight: '600',
                    }}
                  >
                    Start free trial
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleRestore}
                disabled={isRestoring}
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
                  <ActivityIndicator color={colors.primary.main} />
                ) : (
                  <Text style={{ color: colors.primary.main, fontSize: 14 }}>
                    Restore purchases
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {showRedeem ? (
            <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Access code"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Access code"
                // The input sits at the bottom of the card — keep it visible
                // above the keyboard (KeyboardAvoidingView shrinks the scroll
                // area; this scrolls the input into it).
                onFocus={() =>
                  setTimeout(
                    () => scrollRef.current?.scrollToEnd({ animated: true }),
                    100
                  )
                }
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: colors.text,
                  fontSize: 15,
                  marginBottom: 10,
                  minHeight: 48,
                }}
              />
              <TouchableOpacity
                onPress={handleRedeem}
                disabled={!code.trim() || isRedeeming}
                accessibilityRole="button"
                accessibilityLabel="Redeem access code"
                accessibilityState={{ disabled: !code.trim() || isRedeeming }}
                style={{
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.primary.main,
                  alignItems: 'center',
                  opacity: !code.trim() || isRedeeming ? 0.6 : 1,
                  minHeight: 48,
                  justifyContent: 'center',
                }}
              >
                {isRedeeming ? (
                  <ActivityIndicator color={colors.primary.main} />
                ) : (
                  <Text
                    style={{
                      color: colors.primary.main,
                      fontSize: 15,
                      fontWeight: '600',
                    }}
                  >
                    Redeem
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setShowRedeem(true)}
              accessibilityRole="button"
              accessibilityLabel="Redeem an access code"
              hitSlop={14}
              style={{ marginTop: 12, minHeight: 44, justifyContent: 'center' }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                Have a code?
              </Text>
            </TouchableOpacity>
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
