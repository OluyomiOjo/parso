import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useSession } from './auth';
import type { SaveListItem } from './saves';
import { supabase } from './supabase';

// Where a matched word was found, as returned by the `search` Edge Function.
export type MatchField = 'title' | 'snippet' | 'summary' | 'tags' | 'note' | 'collection' | 'source';
export type Match = { field: MatchField; term: string };

export type SearchResult = SaveListItem & {
  summary: string | null;
  tags: string[];
  note: string | null;
  collection_name: string | null;
  matches: Match[];
};

export const termsFor = (matches: Match[], field: MatchField) =>
  matches.filter((m) => m.field === field).map((m) => m.term);

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

export const SEARCH_FAILED = "Search didn't work. Check your connection and try again.";

export function useSearch(query: string, kind: string | null, debounceMs: number) {
  const { session } = useSession();
  const q = useDebounced(query.trim(), debounceMs);
  return useQuery({
    queryKey: ['search', session?.user.id, q, kind],
    enabled: Boolean(session && q),
    placeholderData: keepPreviousData, // keep the last results on screen while the next ones load
    staleTime: 30_000,
    queryFn: async (): Promise<SearchResult[]> => {
      const { data, error } = await supabase.functions.invoke<{ results: SearchResult[] }>('search', {
        body: { query: q, kind },
      });
      if (error || !data) throw new Error(SEARCH_FAILED);
      return data.results;
    },
  });
}
