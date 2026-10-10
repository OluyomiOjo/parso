import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useSession } from './auth';

// When the Reminders page was last opened, kept on this phone. The first time it's read it starts from now, so
// reminders that went off before the bell existed don't all count at once.
const KEY = 'parso.reminders.seenAt';
const QUERY_KEY = ['reminders-seen'];

async function readSeenAt(): Promise<Date> {
  const stored = await AsyncStorage.getItem(KEY).catch(() => null);
  if (stored) return new Date(stored);
  const now = new Date();
  await AsyncStorage.setItem(KEY, now.toISOString()).catch(() => undefined);
  return now;
}

export function useRemindersSeenAt() {
  const { session } = useSession();
  return useQuery({ queryKey: QUERY_KEY, enabled: Boolean(session), queryFn: readSeenAt, staleTime: Infinity });
}

// Called when the Reminders page opens: the bell's number goes back to none.
export function useMarkRemindersSeen() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    const now = new Date();
    queryClient.setQueryData(QUERY_KEY, now);
    void AsyncStorage.setItem(KEY, now.toISOString()).catch(() => undefined);
  }, [queryClient]);
}
