import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, INTRO_ELIGIBILITY_STATUS, type PurchasesPackage } from 'react-native-purchases';

import { useSession } from './auth';
import { MONTHS } from './format';
import {
  type MyNumbers,
  needsUpgrade,
  offerAfterFirstSave,
  type Plan,
  trialDays,
  trialReminderAt,
  trialReminderText,
} from './plan';
import { ensureNotificationPermission, REMINDER_CHANNEL } from './reminders';
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
      // Keeps the trial's reminder in step with the subscription: set during a trial, gone once it's paid or cancelled.
      Purchases.addCustomerInfoUpdateListener((info) => void syncTrialReminder(info));
      Purchases.getCustomerInfo()
        .then((info) => syncTrialReminder(info))
        .catch(() => undefined);
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

// The person's own counts for the Pro page (my_numbers, migration 0028): saves, collections, saves opened.
export function useMyNumbers(enabled = true) {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['saves', userId, 'my-numbers'],
    enabled: enabled && Boolean(userId),
    queryFn: async (): Promise<MyNumbers> => {
      const { data, error } = await supabase.rpc('my_numbers');
      if (error) throw error;
      return data as unknown as MyNumbers;
    },
  });
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

// What the person was saving when the free limit stopped it, shown on the Pro page as "Waiting to save" (owner
// decision after build 20). Only given when that save really goes through after subscribing.
export type WaitingSave = { title: string; kind: string; source: string; imageUri?: string | null };

// The save that was waiting when the upgrade screen opened; it runs once the person is on Pro.
let pending: (() => void) | null = null;
let pendingPreview: WaitingSave | null = null;
let pendingFirst = false; // opened once after the first save, to offer the free trial

export function openUpgrade(retry?: () => void, preview?: WaitingSave, afterFirstSave = false) {
  pending = retry ?? null;
  pendingPreview = preview ?? null;
  pendingFirst = afterFirstSave;
  track('upgrade_shown');
  router.push('/upgrade');
}

export const waitingSave = () => pendingPreview;
export const openedAfterFirstSave = () => pendingFirst;

export function takePendingSave() {
  const run = pending;
  pending = null;
  pendingPreview = null;
  pendingFirst = false;
  return run;
}

// trial: the free trial's length in days on Yearly, when this person can still start one (Apple gives one per person).
export type Offer = { yearly: PurchasesPackage | null; monthly: PurchasesPackage | null; trial: number | null };

export function useOffer() {
  return useQuery({
    queryKey: ['pro-offer'],
    enabled: configured,
    networkMode: 'always', // RevenueCat answers from its own copy when offline, or says it can't
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<Offer> => {
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      const yearly = current?.annual ?? null;
      let trial = trialDays(yearly?.product.introPrice);
      if (yearly && trial) {
        const id = yearly.product.identifier;
        const eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility([id]).catch(() => null);
        if (eligibility?.[id]?.status !== INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE) trial = null;
      }
      return { yearly, monthly: current?.monthly ?? null, trial };
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
    track('subscribe_tapped');
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const active = Boolean(customerInfo.entitlements.active[ENTITLEMENT]);
    if (active) track('purchase_made');
    // A trial was started: ask to send the promised reminder (iOS shows its own prompt once), then set it.
    if (customerInfo.entitlements.active[ENTITLEMENT]?.periodType === 'TRIAL') {
      await ensureNotificationPermission().catch(() => undefined);
      await syncTrialReminder(customerInfo);
    }
    return afterPurchase(active, refresh);
  };
  const restore = async () => {
    track('restore_tapped');
    const customerInfo = await Purchases.restorePurchases();
    return afterPurchase(Boolean(customerInfo.entitlements.active[ENTITLEMENT]), refresh);
  };
  return { buy, restore };
}

// Purchases.purchasePackage throws when the person closes Apple's sheet; that's not an error to show.
export const cancelledPurchase = (error: unknown) =>
  Boolean(error && typeof error === 'object' && 'userCancelled' in error && error.userCancelled);

const TRIAL_REMINDER = 'parso-trial-ends';

// "Your Parso Pro trial ends in 2 days", on the phone, 2 days before a trial that will renew ends (the Pro page
// promises it; Apple sends no such warning). Cancelled when there's no such trial.
async function syncTrialReminder(info: CustomerInfo) {
  try {
    await Notifications.cancelScheduledNotificationAsync(TRIAL_REMINDER);
    const pro = info.entitlements.active[ENTITLEMENT];
    if (!pro || pro.periodType !== 'TRIAL' || !pro.willRenew || !pro.expirationDate) return;
    const ends = new Date(pro.expirationDate);
    const at = trialReminderAt(ends);
    if (!at || !(await Notifications.getPermissionsAsync()).granted) return;
    await Notifications.scheduleNotificationAsync({
      identifier: TRIAL_REMINDER,
      content: trialReminderText(ends, MONTHS),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: REMINDER_CHANNEL },
    });
  } catch {
    // a missed reminder is never worth an error; Apple's receipt email still says when it renews
  }
}

const FIRST_OFFER_KEY = 'parso.pro.offeredAfterFirstSave';
const FIRST_OFFER_DELAY_MS = 900; // the save sheet closes first

// On Parsos: once, after the first save, the Pro page offering the free trial (owner decision after build 22). Only
// when the trial can actually be started (prices loaded, this person eligible), so it's never an empty page.
export function useOfferAfterFirstSave() {
  const { data: plan } = usePlan();
  const { data: offer } = useOffer();
  useFocusEffect(
    useCallback(() => {
      if (!offer?.trial || !offerAfterFirstSave(plan, false)) return;
      let cancelled = false;
      const timer = setTimeout(async () => {
        const offered = await AsyncStorage.getItem(FIRST_OFFER_KEY).catch(() => '1');
        if (cancelled || offered) return;
        await AsyncStorage.setItem(FIRST_OFFER_KEY, '1').catch(() => undefined);
        openUpgrade(undefined, undefined, true);
      }, FIRST_OFFER_DELAY_MS);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }, [offer?.trial, plan]),
  );
}
