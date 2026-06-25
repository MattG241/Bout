/**
 * Monetization layer (RevenueCat) — deliberately isolated and optional. Nothing in the core
 * loop depends on this; if it's not configured, the app behaves as fully free. Entitlements
 * gate deeper stats, advanced puzzles, larger custom leagues, and cosmetics — never the daily
 * bout, the ladder, or fairness.
 */
import { Platform } from 'react-native';
import Purchases, { type PurchasesOffering, type CustomerInfo } from 'react-native-purchases';
import { env } from './env';

export const ENTITLEMENT_PREMIUM = 'season_pass';
export const ENTITLEMENT_COSMETICS = 'cosmetics';

let initialized = false;

export function isMonetizationConfigured(): boolean {
  const key = Platform.OS === 'ios' ? env.revenueCatApiKeyIos : env.revenueCatApiKeyAndroid;
  return !!key && !key.startsWith('YOUR_');
}

/** Idempotently configure RevenueCat for the signed-in user. Safe no-op when unconfigured. */
export async function initPurchases(appUserId?: string): Promise<void> {
  if (!isMonetizationConfigured()) return;
  const apiKey = Platform.OS === 'ios' ? env.revenueCatApiKeyIos : env.revenueCatApiKeyAndroid;
  try {
    if (!initialized) {
      Purchases.configure({ apiKey, appUserID: appUserId });
      initialized = true;
    } else if (appUserId) {
      // Already configured (e.g. as an anonymous user) — bind purchases to this account.
      await Purchases.logIn(appUserId);
    }
  } catch {
    // Leave uninitialized; the app stays fully functional without purchases.
  }
}

/** Detach the current user from RevenueCat on sign-out. */
export async function logoutPurchases(): Promise<void> {
  if (!initialized) return;
  try {
    await Purchases.logOut();
  } catch {
    // ignore
  }
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!isMonetizationConfigured()) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch {
    return null;
  }
}

export async function getEntitlements(): Promise<string[]> {
  if (!isMonetizationConfigured()) return [];
  try {
    const info = await Purchases.getCustomerInfo();
    return activeEntitlements(info);
  } catch {
    return [];
  }
}

function activeEntitlements(info: CustomerInfo): string[] {
  return Object.keys(info.entitlements.active ?? {});
}

export async function purchasePremium(): Promise<{ success: boolean; entitlements: string[] }> {
  if (!isMonetizationConfigured()) return { success: false, entitlements: [] };
  const offering = await getCurrentOffering();
  const pkg = offering?.availablePackages?.[0];
  if (!pkg) return { success: false, entitlements: [] };
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: true, entitlements: activeEntitlements(customerInfo) };
  } catch {
    return { success: false, entitlements: await getEntitlements() };
  }
}

export async function restorePurchases(): Promise<string[]> {
  if (!isMonetizationConfigured()) return [];
  try {
    const info = await Purchases.restorePurchases();
    return activeEntitlements(info);
  } catch {
    return [];
  }
}

export function hasPremium(entitlements: string[]): boolean {
  return entitlements.includes(ENTITLEMENT_PREMIUM);
}
