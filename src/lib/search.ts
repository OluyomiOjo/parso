import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useSession } from './auth';
import { sourceLabel } from './format';
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

const MAX_SUGGESTIONS = 8;

// "Try" pills for the empty Search tab, built from the person's own saves: their most common tags, their
// most-used apps ("from Instagram") and their collections, so every pill finds something.
export function useSearchSuggestions(collectionNames: string[]) {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data } = useQuery({
    queryKey: ['search', userId, 'suggestions'],
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('saves').select('tags, source, kind').limit(500);
      if (error) throw error;
      return data;
    },
  });

  const rows = data ?? [];
  const count = (values: string[]) => {
    const counts = new Map<string, number>();
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
  };
  const tags = count(rows.flatMap((r) => r.tags)).slice(0, 4);
  const apps = count(rows.filter((r) => r.kind === 'link' && r.source !== 'other').map((r) => r.source))
    .slice(0, 2)
    .map((s) => `from ${sourceLabel(s, null)}`);

  const suggestions: string[] = [];
  for (const s of [...tags, ...apps, ...collectionNames.map((n) => n.toLowerCase())]) {
    if (!suggestions.some((existing) => existing.toLowerCase() === s.toLowerCase())) suggestions.push(s);
  }
  return suggestions.slice(0, MAX_SUGGESTIONS);
}
