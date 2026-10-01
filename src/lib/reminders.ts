import { useQuery } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { useSession } from './auth';
import { reminderTime, type ReminderChoice } from './reminderTime';
import { type SaveListItem, useUpdateSave } from './saves';
import { supabase } from './supabase';

// Reminders are stored in saves.reminder_at and delivered as notifications scheduled on this phone.
// The database is the record; the phone's schedule is kept in step with it by useReminderSync.

const PREFIX = 'reminder-';
const BODY = 'You asked Parso to remind you about this.';
const RECENTLY_DUE_MS = 24 * 60 * 60 * 1000; // the home card keeps a due reminder for a day

// Show reminders as banners even while Parso is open.
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export type Permission = 'granted' | 'denied';

// Asks once (iOS shows its own prompt); afterwards only Settings can change the answer.
export async function ensureNotificationPermission(): Promise<Permission> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'denied';
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted ? 'granted' : 'denied';
}

type Remindable = { id: string; title: string | null; url: string | null };

async function schedule(save: Remindable, when: Date) {
  const identifier = `${PREFIX}${save.id}`;
  await Notifications.cancelScheduledNotificationAsync(identifier);
  if (when.getTime() <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title: save.title ?? save.url ?? 'Your save', body: BODY, data: { saveId: save.id } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
  });
}

const cancel = (saveId: string) => Notifications.cancelScheduledNotificationAsync(`${PREFIX}${saveId}`);

// Sets or clears a save's reminder. Returns whether notifications are allowed, so the caller can say
// what to do if they aren't; the reminder is kept either way.
export function useSetReminder(save: Remindable | undefined) {
  const updateSave = useUpdateSave(save?.id ?? '');
  return async (choice: ReminderChoice | null): Promise<Permission> => {
    if (!save) return 'granted';
    if (!choice) {
      await updateSave.mutateAsync({ reminder_at: null });
      await cancel(save.id);
      return 'granted';
    }
    const when = reminderTime(choice);
    const permission = await ensureNotificationPermission();
    await updateSave.mutateAsync({ reminder_at: when.toISOString() });
    if (permission === 'granted') await schedule(save, when);
    return permission;
  };
}

type UpcomingReminder = Remindable & { reminder_at: string };

// Brings the phone's scheduled notifications in line with the database: schedules missing or moved
// reminders and cancels ones that were cleared, deleted or belong to someone who signed out. Runs when
// the app opens and whenever the person's saves change.
export function useReminderSync() {
  const { session, loading } = useSession();
  const userId = session?.user.id;
  const { data: upcoming } = useQuery({
    queryKey: ['saves', userId, 'reminders'],
    enabled: Boolean(userId),
    queryFn: async (): Promise<UpcomingReminder[]> => {
      const { data, error } = await supabase
        .from('saves')
        .select('id, title, url, reminder_at')
        .gt('reminder_at', new Date().toISOString());
      if (error) throw error;
      return data as UpcomingReminder[];
    },
  });

  useEffect(() => {
    if (loading || (userId && !upcoming)) return; // wait for the list; don't cancel everything while loading
    (async () => {
      const scheduled = (await Notifications.getAllScheduledNotificationsAsync()).filter((n) =>
        n.identifier.startsWith(PREFIX),
      );
      const wanted = new Map((upcoming ?? []).map((s) => [`${PREFIX}${s.id}`, s]));
      for (const n of scheduled)
        if (!wanted.has(n.identifier)) await Notifications.cancelScheduledNotificationAsync(n.identifier);
      if (!userId || !(await Notifications.getPermissionsAsync()).granted) return;
      const have = new Map(scheduled.map((n) => [n.identifier, n]));
      for (const [identifier, save] of wanted) {
        const existing = have.get(identifier);
        const trigger = existing?.trigger as { value?: number; date?: number } | undefined;
        const at = trigger?.value ?? trigger?.date;
        if (!existing || at !== new Date(save.reminder_at).getTime()) await schedule(save, new Date(save.reminder_at));
      }
    })().catch(() => undefined); // a failed sync retries on the next change or launch
  }, [loading, userId, upcoming]);
}

// Tapping a reminder opens its save, whether Parso was open or closed.
export function useReminderTaps() {
  const response = Notifications.useLastNotificationResponse();
  const { session, loading } = useSession();
  useEffect(() => {
    const saveId = response?.notification.request.content.data?.saveId;
    if (loading || !session || typeof saveId !== 'string') return;
    if (response?.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    Notifications.clearLastNotificationResponse();
    router.push(`/item/${saveId}`);
  }, [response, session, loading]);
}

export type ReminderSave = SaveListItem & { reminder_at: string };

// The reminder card on My Parsos: the earliest reminder that is upcoming or came due in the last day.
export function useNextReminder() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['saves', userId, 'next-reminder'],
    enabled: Boolean(userId),
    refetchInterval: 60_000, // so "Tonight at 8:00 PM" turns into "Due now" on time
    queryFn: async (): Promise<ReminderSave | null> => {
      const { data, error } = await supabase
        .from('saves')
        .select('id, kind, source, url, title, snippet, thumbnail_path, created_at, processed_at, reminder_at')
        .gte('reminder_at', new Date(Date.now() - RECENTLY_DUE_MS).toISOString())
        .order('reminder_at')
        .limit(1);
      if (error) throw error;
      return (data[0] as ReminderSave | undefined) ?? null;
    },
  });
}
