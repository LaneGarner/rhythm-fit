import Constants, { ExecutionEnvironment } from 'expo-constants';
import { NativeModules, Platform } from 'react-native';
import type {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import { REVENUECAT_IOS_KEY } from '../config/api';

// RevenueCat entitlement identifier that unlocks the Coach.
export const COACH_ENTITLEMENT_ID = 'coach';

// react-native-purchases is a native module that isn't present in Expo Go —
// and also missing from dev clients built before the SDK was added. Like the
// native tab bar (TabNavigator.tsx), every call here no-ops when the module
// is absent and reports "not subscribed"; up-to-date dev/EAS builds get the
// real SDK.
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function isPurchasesAvailable(): boolean {
  return (
    !isExpoGo &&
    Platform.OS === 'ios' &&
    Boolean(REVENUECAT_IOS_KEY) &&
    NativeModules.RNPurchases != null
  );
}

// Lazy require so builds without the native module never load it.
function getPurchases() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('react-native-purchases').default;
}

let configured = false;

export function initPurchases(): void {
  if (!isPurchasesAvailable() || configured) return;
  try {
    getPurchases().configure({ apiKey: REVENUECAT_IOS_KEY });
    configured = true;
  } catch (err) {
    // Belt and suspenders: never let SDK init take down the app.
    console.error('RevenueCat configure error:', err);
  }
}

export async function loginPurchases(
  userId: string
): Promise<CustomerInfo | null> {
  if (!isPurchasesAvailable()) return null;
  initPurchases();
  try {
    const { customerInfo } = await getPurchases().logIn(userId);
    return customerInfo;
  } catch (err) {
    console.error('RevenueCat login error:', err);
    return null;
  }
}

export async function logoutPurchases(): Promise<void> {
  if (!isPurchasesAvailable() || !configured) return;
  try {
    await getPurchases().logOut();
  } catch {
    // Already anonymous — nothing to do.
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isPurchasesAvailable()) return null;
  initPurchases();
  try {
    return await getPurchases().getCustomerInfo();
  } catch (err) {
    console.error('RevenueCat customer info error:', err);
    return null;
  }
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!isPurchasesAvailable()) return null;
  initPurchases();
  try {
    const offerings = await getPurchases().getOfferings();
    return offerings.current ?? null;
  } catch (err) {
    console.error('RevenueCat offerings error:', err);
    return null;
  }
}

/**
 * Purchase a package. Returns the updated CustomerInfo, or null when the user
 * cancelled the purchase sheet. Other failures rethrow for the caller's error
 * state.
 */
export async function purchaseCoachPackage(
  pkg: PurchasesPackage
): Promise<CustomerInfo | null> {
  if (!isPurchasesAvailable()) return null;
  initPurchases();
  try {
    const { customerInfo } = await getPurchases().purchasePackage(pkg);
    return customerInfo;
  } catch (err: any) {
    if (err?.userCancelled) return null;
    throw err;
  }
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!isPurchasesAvailable()) return null;
  initPurchases();
  return await getPurchases().restorePurchases();
}

/** Returns an unsubscribe function. No-op in Expo Go. */
export function addCustomerInfoListener(
  listener: (info: CustomerInfo) => void
): () => void {
  if (!isPurchasesAvailable()) return () => {};
  initPurchases();
  const Purchases = getPurchases();
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

export function hasCoachEntitlement(info: CustomerInfo | null): boolean {
  return Boolean(info?.entitlements.active[COACH_ENTITLEMENT_ID]);
}
