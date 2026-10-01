import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from './auth';
import type { Tables } from './database.types';
import { supabase } from './supabase';

export type Collection = Pick<Tables<'collections'>, 'id' | 'name'>;

const collectionsKey = (userId: string | undefined) => ['collections', userId] as const;

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
