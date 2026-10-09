import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { useSession } from './auth';
import { useCollections } from './collections';
import { sourceLabel } from './format';
import { LIST_COLUMNS, type SaveListItem } from './saves';
import { supabase } from './supabase';
import { askSince, ASK_MAX, mostCommon, mostSavedLine, pastIndex, showWeekCard, weekRange } from './week';

// The data behind "Your week in Parso". Its own query keys (not under the saves key), so marking a save done
// on the weekly screen leaves the row in place with Undo instead of making it vanish.

export type AskSave = SaveListItem & { reminder_at: string | null };

export type WeekData = {
  saved: number;
  done: number;
  mostSaved: string | null;
  asks: AskSave[];
  past: SaveListItem | null;
};

const OPENED_KEY = 'parso.week.openedAt'; // when the weekly screen was last opened, on this phone
const ASK_COLUMNS = `${LIST_COLUMNS}, reminder_at`;
const RANGE_LIMIT = 1000;

// Recent saves that aren't done. The notification counts these too.
export const openAsks = (since: Date) =>
  supabase
    .from('saves')
    .select(ASK_COLUMNS, { count: 'exact' })
    .is('done_at', null)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false });

async function pastSave(weekEnd: Date, before: Date): Promise<SaveListItem | null> {
  const { count, error } = await supabase
    .from('saves')
    .select('id', { count: 'exact', head: true })
    .lt('created_at', before.toISOString());
  if (error) throw error;
  const index = pastIndex(weekEnd, count ?? 0);
  if (index < 0) return null;
  const { data, error: pickError } = await supabase
    .from('saves')
    .select(LIST_COLUMNS)
    .lt('created_at', before.toISOString())
    .order('created_at')
    .range(index, index);
  if (pickError) throw pickError;
  return data[0] ?? null;
}

export function useWeek() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: collections = [] } = useCollections();
  const [now] = useState(() => new Date());
  const range = useMemo(() => weekRange(now), [now]);

  const query = useQuery({
    queryKey: ['week', userId, range.end.toISOString()],
    enabled: Boolean(userId),
    queryFn: async () => {
      const since = askSince(now);
      const [inRange, doneCount, asks, past] = await Promise.all([
        supabase
          .from('saves')
          .select('kind, source, url, collection_id')
          .gte('created_at', range.start.toISOString())
          .lt('created_at', range.end.toISOString())
          .limit(RANGE_LIMIT),
        supabase
          .from('saves')
          .select('id', { count: 'exact', head: true })
          .gte('done_at', range.start.toISOString())
          .lt('done_at', range.end.toISOString()),
        openAsks(since).limit(ASK_MAX),
        pastSave(range.end, since),
      ]);
      if (inRange.error) throw inRange.error;
      if (doneCount.error) throw doneCount.error;
      if (asks.error) throw asks.error;
      return { saves: inRange.data, done: doneCount.count ?? 0, asks: asks.data as AskSave[], past };
    },
  });

  const data = useMemo((): WeekData | undefined => {
    if (!query.data) return undefined;
    const { saves, done, asks, past } = query.data;
    const names = new Map(collections.map((c) => [c.id, c.name]));
    const collection = mostCommon(saves.map((s) => (s.collection_id ? (names.get(s.collection_id) ?? null) : null)));
    const app = mostCommon(
      saves.map((s) => (s.kind === 'link' && s.source !== 'other' ? sourceLabel(s.source, s.url) : null)),
    );
    return { saved: saves.length, done, mostSaved: mostSavedLine(collection, app), asks, past };
  }, [query.data, collections]);

  return { range, data, isPending: query.isPending, isError: query.isError, refetch: query.refetch };
}

export async function markWeekOpened() {
  await AsyncStorage.setItem(OPENED_KEY, new Date().toISOString()).catch(() => undefined);
}

// Whether Parsos shows "Your week in Parso is ready": rechecked each time the tab comes back into view.
export function useWeekCard(): boolean {
  const [visible, setVisible] = useState(false);
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(OPENED_KEY)
        .then((opened) => setVisible(showWeekCard(new Date(), opened ? new Date(opened) : null)))
        .catch(() => setVisible(false));
    }, []),
  );
  return visible;
}
