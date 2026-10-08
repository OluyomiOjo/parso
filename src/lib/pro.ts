import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

import { useSession } from './auth';
import { needsUpgrade, type Plan } from './plan';
import { supabase } from './supabase';
import { track } from './track';

// Parso Pro through RevenueCat (CLAUDE.md scope 15). RevenueCat knows each person by their Parso account id. The
// key is RevenueCat's public app key, set per build in Expo's build settings; without it (or off iOS) purchases are
// simply unavailable and the upgrade screen says so.
const KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const ENTITLEMENT = 'pro';
let configured = false;
export const purchasesAvailable = () => configured;

// Keeps RevenueCat signed in as the same person as Parso. Used once, at the app's root.
export function usePurchasesAccount() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!KEY || Platform.OS !== 'ios') return;
    if (!configured) {
      Purchases.configure({ apiKey: KEY, appUserID: userId });
      configured = true;
      return;
    }
    if (userId) Purchases.logIn(userId).catch(() => undefined);
    else Purchases.logOut().catch(() => undefined); // already anonymous: nothing to do
  }, [userId]);
}

// Under the saves key, so every change to saves (a new save, a delete) refreshes the count too.
const planKey = (userId: string | undefined) => ['saves', userId, 'plan'] as const;

async function fetchPlan(): Promise<Plan> {
  const { data, error } = await supabase.rpc('my_plan');
  if (error) throw error;
  const row = data as { pro: boolean; used: number; pro_until: string | null; admin_pro: boolean };
  return { pro: row.pro, used: row.used, proUntil: row.pro_until, adminPro: row.admin_pro };
}

export function usePlan() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({ queryKey: planKey(userId), enabled: Boolean(userId), queryFn: fetchPlan });
}

// Checked just before saving, so the person sees the upgrade screen instead of an error. The database refuses a
// save over the limit anyway (migration 0022); if this check can't run, the save goes ahead and the server decides.
export async function canSave(): Promise<boolean> {
  try {
    return !needsUpgrade(await fetchPlan());
  } catch {
    return true;
  }
}

// The save that was waiting when the upgrade screen opened; it runs once the person is on Pro.
let pending: (() => void) | null = null;

export function openUpgrade(retry?: () => void) {
  pending = retry ?? null;
  track('upgrade_shown');
  router.push('/upgrade');
}

export function takePendingSave() {
  const run = pending;
  pending = null;
  return run;
}

export type Offer = { yearly: PurchasesPackage | null; monthly: PurchasesPackage | null };

export function useOffer() {
  return useQuery({
    queryKey: ['pro-offer'],
    enabled: configured,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<Offer> => {
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      return { yearly: current?.annual ?? null, monthly: current?.monthly ?? null };
    },
  });
}

// After buying or restoring: asks the server to bring Pro up to date (sync-pro), then refreshes the plan. Returns
// whether the person is now Pro, by RevenueCat's own record.
async function afterPurchase(active: boolean, refresh: () => Promise<unknown>) {
  await supabase.functions.invoke('sync-pro').catch(() => undefined);
  await refresh();
  return active;
}

export function usePurchase() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const refresh = () => queryClient.invalidateQueries({ queryKey: planKey(session?.user.id) });

  const buy = async (pkg: PurchasesPackage) => {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const active = Boolean(customerInfo.entitlements.active[ENTITLEMENT]);
    if (active) track('purchase_made');
    return afterPurchase(active, refresh);
  };
  const restore = async () => {
    const customerInfo = await Purchases.restorePurchases();
    return afterPurchase(Boolean(customerInfo.entitlements.active[ENTITLEMENT]), refresh);
  };
  return { buy, restore };
}

// Purchases.purchasePackage throws when the person closes Apple's sheet; that's not an error to show.
export const cancelledPurchase = (error: unknown) =>
  Boolean(error && typeof error === 'object' && 'userCancelled' in error && error.userCancelled);
