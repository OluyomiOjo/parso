import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { Tables } from './database.types';
import { useSession } from './auth';
import { detectSource } from './links';
import { addPreviewImage } from './previewImage';
import { supabase } from './supabase';
import { track } from './track';

export type SaveListItem = Pick<
  Tables<'saves'>,
  | 'id'
  | 'kind'
  | 'source'
  | 'url'
  | 'title'
  | 'snippet'
  | 'thumbnail_path'
  | 'thumbnail_width'
  | 'thumbnail_height'
  | 'author_handle'
  | 'created_at'
  | 'processed_at'
  | 'pinned'
  | 'edited_at'
>;

export const LIST_COLUMNS =
  'id, kind, source, url, title, snippet, thumbnail_path, thumbnail_width, thumbnail_height, author_handle, created_at, processed_at, pinned, edited_at';
const LIST_LIMIT = 50;

export const savesKey = (userId: string | undefined) => ['saves', userId] as const;
const collectionSavesKey = (userId: string | undefined, collectionId: string) =>
  [...savesKey(userId), 'collection', collectionId] as const;
const COLLECTION_LIMIT = 200;
export const saveKey = (id: string) => ['save', id] as const;

export type SaveDetail = Pick<
  Tables<'saves'>,
  | 'id'
  | 'kind'
  | 'source'
  | 'url'
  | 'title'
  | 'snippet'
  | 'summary'
  | 'raw_text'
  | 'tags'
  | 'note'
  | 'collection_id'
  | 'thumbnail_path'
  | 'created_at'
  | 'processed_at'
  | 'reminder_at'
  | 'preview_image_url'
  | 'author_handle'
  | 'pinned'
  | 'edited_at'
>;

const DETAIL_COLUMNS =
  'id, kind, source, url, title, snippet, summary, raw_text, tags, note, collection_id, thumbnail_path, created_at, processed_at, reminder_at, preview_image_url, author_handle, pinned, edited_at';

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

export function useCollectionSaves(collectionId: string) {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: collectionSavesKey(userId, collectionId),
    enabled: Boolean(userId),
    queryFn: async (): Promise<SaveListItem[]> => {
      const { data, error } = await supabase
        .from('saves')
        .select(LIST_COLUMNS)
        .eq('collection_id', collectionId)
        .order('created_at', { ascending: false })
        .limit(COLLECTION_LIMIT);
      if (error) throw error;
      return data;
    },
  });
}

// Processing happens on the server after a save is created; refresh the list whenever one of
// this user's saves changes so new titles and thumbnails appear without pulling down.
export function useSavesLiveUpdates() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`saves:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'saves',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: savesKey(userId) });
          queryClient.invalidateQueries({ queryKey: ['collections', userId] }); // the AI may have made a new one
          const id = (payload.new as { id?: string }).id;
          if (id) queryClient.invalidateQueries({ queryKey: saveKey(id) });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);
}

const SIGNED_URL_SECONDS = 60 * 60;

// Thumbnails live in a private bucket; sign every path in the list with one request.
export function useThumbnailUrls(paths: string[]) {
  const sorted = [...new Set(paths)].sort();
  return useQuery({
    queryKey: ['thumbnails', sorted],
    enabled: sorted.length > 0,
    staleTime: (SIGNED_URL_SECONDS - 5 * 60) * 1000, // re-sign before the links expire
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase.storage.from('thumbnails').createSignedUrls(sorted, SIGNED_URL_SECONDS);
      if (error) throw error;
      const urls: Record<string, string> = {};
      for (const item of data) if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
      return urls;
    },
  });
}

export type CreatedLinkSave = SaveListItem & { existing: boolean };

// Saves a link, unless this person already has it: then the existing save comes back with existing: true and
// nothing is inserted (pasting the same copied link twice made duplicates). A new row shows at the top of the
// list straight away and is replaced by the server's copy once the insert lands.
// via says where the link came from, for the usage numbers (src/lib/track.ts).
export function useCreateLinkSave(via: 'add' | 'clipboard') {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const key = savesKey(session?.user.id);

  return useMutation({
    mutationFn: async (url: string): Promise<CreatedLinkSave> => {
      const { data: found, error: findError } = await supabase
        .from('saves')
        .select(LIST_COLUMNS)
        .eq('url', url)
        .order('created_at', { ascending: false })
        .limit(1);
      if (findError) throw findError;
      if (found[0]) return { ...found[0], existing: true };

      await queryClient.cancelQueries({ queryKey: key });
      const optimistic: SaveListItem = {
        id: `pending-${Date.now()}`,
        kind: 'link',
        source: detectSource(url),
        url,
        title: null,
        snippet: null,
        thumbnail_path: null,
        thumbnail_width: null,
        thumbnail_height: null,
        author_handle: null,
        created_at: new Date().toISOString(),
        processed_at: null,
        pinned: false,
        edited_at: null,
      };
      queryClient.setQueryData<SaveListItem[]>(key, (previous) => [optimistic, ...(previous ?? [])]);

      const { data, error } = await supabase
        .from('saves')
        .insert({ kind: 'link', source: detectSource(url), url })
        .select(LIST_COLUMNS)
        .single();
      if (error) throw error;
      void addPreviewImage(data);
      track('save_created', { kind: 'link', source: data.source, via });
      return { ...data, existing: false };
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useSave(id: string, enabled = true) {
  return useQuery({
    queryKey: saveKey(id),
    enabled,
    queryFn: async (): Promise<SaveDetail> => {
      const { data, error } = await supabase.from('saves').select(DETAIL_COLUMNS).eq('id', id).single();
      if (error) throw error;
      return data;
    },
  });
}

// Changes the person makes in the save sheet or on the detail page: collection, note, tags. The database
// refreshes the save's search data after each change (trigger in migration 0011).
export function useUpdateSave(id: string) {
  const queryClient = useQueryClient();
  const { session } = useSession();
  return useMutation({
    mutationFn: async (changes: Partial<Pick<SaveDetail, 'collection_id' | 'note' | 'tags' | 'reminder_at'>>) => {
      const { error } = await supabase.from('saves').update(changes).eq('id', id);
      if (error) throw error;
    },
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: saveKey(id) });
      const previous = queryClient.getQueryData<SaveDetail>(saveKey(id));
      if (previous)
        queryClient.setQueryData<SaveDetail>(saveKey(id), {
          ...previous,
          ...changes,
        });
      return { previous };
    },
    onError: (_error, _changes, context) => queryClient.setQueryData(saveKey(id), context?.previous),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: saveKey(id) });
      queryClient.invalidateQueries({ queryKey: savesKey(session?.user.id) });
      queryClient.invalidateQueries({
        queryKey: ['collections', session?.user.id],
      }); // counts and tiles
      queryClient.invalidateQueries({ queryKey: ['search', session?.user.id] });
    },
  });
}

export const DELETE_FAILED = "Couldn't delete this save. Check your connection and try again.";

// Removes the save, then its pictures (thumbnail, and the original upload for photos and screenshots).
// A picture left behind by a failed file delete is harmless: nothing points at it any more.
export function useDeleteSave(save: Pick<SaveDetail, 'id' | 'kind' | 'thumbnail_path'> | undefined) {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;
  return useMutation({
    mutationFn: async () => {
      if (!save || !userId) throw new Error(DELETE_FAILED);
      const { error } = await supabase.from('saves').delete().eq('id', save.id);
      if (error) throw new Error(DELETE_FAILED);
      if (save.thumbnail_path) await supabase.storage.from('thumbnails').remove([save.thumbnail_path]);
      if (save.kind === 'image' || save.kind === 'screenshot') {
        await supabase.storage.from('uploads').remove([`${userId}/${save.id}.jpg`]);
      }
    },
    onSuccess: () => {
      if (save) queryClient.removeQueries({ queryKey: saveKey(save.id) });
      queryClient.invalidateQueries({ queryKey: savesKey(userId) });
      queryClient.invalidateQueries({ queryKey: ['collections', userId] });
      queryClient.invalidateQueries({ queryKey: ['search', userId] });
    },
  });
}
