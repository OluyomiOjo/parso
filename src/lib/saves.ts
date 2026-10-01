import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Tables } from './database.types';
import { useSession } from './auth';
import { detectSource } from './links';
import { supabase } from './supabase';

export type SaveListItem = Pick<
  Tables<'saves'>,
  'id' | 'kind' | 'source' | 'url' | 'title' | 'snippet' | 'thumbnail_path' | 'created_at' | 'processed_at'
>;

const LIST_COLUMNS = 'id, kind, source, url, title, snippet, thumbnail_path, created_at, processed_at';
const LIST_LIMIT = 50;

const savesKey = (userId: string | undefined) => ['saves', userId] as const;

export function useSaves() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: savesKey(userId),
    enabled: Boolean(userId),
    queryFn: async (): Promise<SaveListItem[]> => {
      const { data, error } = await supabase
        .from('saves')
        .select(LIST_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(LIST_LIMIT);
      if (error) throw error;
      return data;
    },
  });
}

// Inserts a link save. The row shows at the top of the list straight away and is
// replaced by the server's copy once the insert lands.
export function useCreateLinkSave() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const key = savesKey(session?.user.id);

  return useMutation({
    mutationFn: async (url: string) => {
      const { data, error } = await supabase
        .from('saves')
        .insert({ kind: 'link', source: detectSource(url), url })
        .select(LIST_COLUMNS)
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (url) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SaveListItem[]>(key);
      const optimistic: SaveListItem = {
        id: `pending-${Date.now()}`,
        kind: 'link',
        source: detectSource(url),
        url,
        title: null,
        snippet: null,
        thumbnail_path: null,
        created_at: new Date().toISOString(),
        processed_at: null,
      };
      queryClient.setQueryData<SaveListItem[]>(key, [optimistic, ...(previous ?? [])]);
      return { previous };
    },
    onError: (_error, _url, context) => {
      queryClient.setQueryData(key, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
