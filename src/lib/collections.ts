import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from './auth';
import type { Tables } from './database.types';
import { supabase } from './supabase';

export type Collection = Pick<Tables<'collections'>, 'id' | 'name'>;

const collectionsKey = (userId: string | undefined) => ['collections', userId] as const;
const overviewKey = (userId: string | undefined) => ['collections', userId, 'overview'] as const;

// One of the newest saves in a collection, for the picture tiles on its card.
export type RecentTile = { thumbnail_path: string | null; kind: string; source: string };

export type CollectionSummary = {
  id: string;
  name: string;
  description: string | null;
  saveCount: number;
  recent: RecentTile[];
};

export function useCollections() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: collectionsKey(userId),
    enabled: Boolean(userId),
    queryFn: async (): Promise<Collection[]> => {
      const { data, error } = await supabase.from('collections').select('id, name').order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

// Creates a collection, or returns the existing one with the same name (names are unique per person,
// ignoring case).
export function useCreateCollection() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  return useMutation({
    mutationFn: async (name: string): Promise<Collection> => {
      const trimmed = name.trim();
      const existing = queryClient
        .getQueryData<Collection[]>(collectionsKey(session?.user.id))
        ?.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
      if (existing) return existing;
      const { data, error } = await supabase.from('collections').insert({ name: trimmed }).select('id, name').single();
      if (error) throw error;
      return data;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: collectionsKey(session?.user.id) }),
  });
}

// Every collection with its save count and newest saves, most recently used first (view 0009).
export function useCollectionOverview() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: overviewKey(userId),
    enabled: Boolean(userId),
    queryFn: async (): Promise<CollectionSummary[]> => {
      const { data, error } = await supabase
        .from('collection_overview')
        .select('id, name, description, save_count, recent')
        .order('last_saved_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map((row) => ({
        id: row.id!,
        name: row.name!,
        description: row.description,
        saveCount: row.save_count ?? 0,
        recent: (row.recent as unknown as RecentTile[] | null) ?? [],
      }));
    },
  });
}

export function useCollectionSummary(id: string) {
  const query = useCollectionOverview();
  return { ...query, data: query.data?.find((c) => c.id === id) };
}

export const DUPLICATE_NAME = (name: string) => `You already have a collection called ${name}. Pick another name.`;

export function useRenameCollection(id: string) {
  const queryClient = useQueryClient();
  const { session } = useSession();
  return useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      const { error } = await supabase.from('collections').update({ name: trimmed }).eq('id', id);
      // 23505: unique on (user_id, lower(name)).
      if (error?.code === '23505') throw new Error(DUPLICATE_NAME(trimmed));
      if (error) throw new Error("Couldn't rename the collection. Check your connection and tap Save again.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: collectionsKey(session?.user.id) }),
  });
}
