import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useSession } from './auth';
import { supabase } from './supabase';
import { askSince, lastWeekEnd, nextWeekEnd, weekNotificationBody } from './week';
import { openAsks } from './weekData';

// The Sunday 6 PM notification for "Your week in Parso": a local notification, like reminders. It's scheduled
// again every time Parso opens, so its numbers are as fresh as the last visit.

const IDENTIFIER = 'parso-week';
const ENABLED_KEY = 'parso.week.notify'; // '0' off; on otherwise
const TITLE = 'Your week in Parso';
const TEST_DELAY_SECONDS = 5;

export async function weeklyUpdateEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY).catch(() => null)) !== '0';
}

async function content() {
  const now = new Date();
  const [saved, waiting] = await Promise.all([
    supabase
      .from('saves')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', lastWeekEnd(now).toISOString()),
    openAsks(askSince(now)).limit(1),
  ]);
  if (saved.error || waiting.error) return null;
  return { title: TITLE, body: weekNotificationBody(saved.count ?? 0, waiting.count ?? 0), data: { week: true } };
}

async function reschedule() {
  await Notifications.cancelScheduledNotificationAsync(IDENTIFIER);
  if (!(await weeklyUpdateEnabled())) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return; // asked when reminders or this switch are used
  const words = await content();
  if (!words) return; // offline: the next open schedules it
  await Notifications.scheduleNotificationAsync({
    identifier: IDENTIFIER,
    content: words,
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: nextWeekEnd(new Date()) },
  });
}

export async function setWeeklyUpdate(on: boolean) {
  await AsyncStorage.setItem(ENABLED_KEY, on ? '1' : '0');
  await reschedule().catch(() => undefined);
}

// Private builds only (the You tab's test button): the same notification, in a few seconds.
export async function sendWeeklyUpdateNow() {
  const words = await content();
  if (!words) throw new Error("Couldn't reach Parso. Check your connection and try again.");
  await Notifications.scheduleNotificationAsync({
    content: words,
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: TEST_DELAY_SECONDS },
  });
}

// At the app's root: schedules the next Sunday's notification on launch and whenever Parso comes back to the
// front, and cancels it for someone signed out.
export function useWeeklyNotification() {
  const { session, loading } = useSession();
  const signedIn = Boolean(session);
  useEffect(() => {
    if (loading) return;
    if (!signedIn) {
      Notifications.cancelScheduledNotificationAsync(IDENTIFIER).catch(() => undefined);
      return;
    }
    const run = () => void reschedule().catch(() => undefined);
    run();
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && run());
    return () => subscription.remove();
  }, [loading, signedIn]);
}
