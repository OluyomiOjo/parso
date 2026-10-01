import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { BestMatchCard } from '@/components/BestMatchCard';
import { ListPanel } from '@/components/ListPanel';
import { Pill } from '@/components/Pill';
import { SaveRow } from '@/components/SaveRow';
import { Screen } from '@/components/Screen';
import { SearchStart } from '@/components/SearchStart';
import { SearchField } from '@/components/SearchField';
import { Text } from '@/components/Text';
import { useCollectionOverview } from '@/lib/collections';
import { useRecentSearches } from '@/lib/recentSearches';
import { useThumbnailUrls } from '@/lib/saves';
import { SEARCH_FAILED, useSearch, useSearchSuggestions } from '@/lib/search';
import { colors, search, sheet, spacing, tabularNums } from '@/theme';

const KIND_PILLS = [
  { kind: null, label: 'All' },
  { kind: 'link', label: 'Links' },
  { kind: 'image', label: 'Photos' },
  { kind: 'screenshot', label: 'Screenshots' },
  { kind: 'text', label: 'Notes' },
] as const;

const resultCount = (n: number) => `${n} ${n === 1 ? 'result' : 'results'}`;

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const { data: results, isFetching, isError, isPlaceholderData } = useSearch(query, kind, search.debounceMs);
  const { data: thumbnails } = useThumbnailUrls(
    (results ?? []).flatMap((r) => (r.thumbnail_path ? [r.thumbnail_path] : [])),
  );

  // Opening the tab (or tapping the field on My Parsos) is a request to type. Coming back from a result
  // keeps the results on screen without raising the keyboard over them.
  const queryRef = useRef(query);
  queryRef.current = query;
  useFocusEffect(
    useCallback(() => {
      if (queryRef.current.trim()) return;
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }, []),
  );

  const { recent, add: remember, clear: clearRecent } = useRecentSearches();
  const { data: collections } = useCollectionOverview();
  const suggestions = useSearchSuggestions((collections ?? []).map((c) => c.name));
  const rememberQuery = () => remember(query);

  const typed = query.trim() !== '';
  const [best, ...rest] = typed ? (results ?? []) : [];

  return (
    <Screen>
      <View style={styles.field}>
        <SearchField value={query} onChangeText={setQuery} inputRef={inputRef} onSubmit={rememberQuery} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.pills}
        contentContainerStyle={styles.pillRow}
      >
        {KIND_PILLS.map((p) => (
          <Pill key={p.label} label={p.label} selected={kind === p.kind} onPress={() => setKind(p.kind)} />
        ))}
      </ScrollView>

      <ScrollView
        style={styles.results}
        contentContainerStyle={styles.resultsContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {!typed ? (
          <SearchStart recent={recent} suggestions={suggestions} onPick={setQuery} onClearRecent={clearRecent} />
        ) : isError && !results ? (
          <Text variant="secondary" color={colors.secondary} style={styles.message}>
            {SEARCH_FAILED}
          </Text>
        ) : !results ? (
          <ActivityIndicator style={styles.message} color={colors.secondary} />
        ) : results.length === 0 && !isPlaceholderData ? (
          <Text variant="secondary" color={colors.secondary} style={styles.message}>
            Nothing matches “{query.trim()}”. Try different words, or fewer of them.
          </Text>
        ) : (
          <View style={isFetching && isPlaceholderData ? styles.stale : null}>
            <Text variant="secondary" color={colors.secondary} style={[styles.count, tabularNums]}>
              {resultCount(results.length)}
            </Text>
            {best ? (
              <BestMatchCard
                result={best}
                onOpen={rememberQuery}
                thumbnailUrl={best.thumbnail_path ? thumbnails?.[best.thumbnail_path] : undefined}
              />
            ) : null}
            {rest.length ? (
              <View style={styles.list}>
                <ListPanel>
                  {rest.map((r) => (
                    <SaveRow
                      key={r.id}
                      save={r}
                      matches={r.matches}
                      onOpen={rememberQuery}
                      thumbnailUrl={r.thumbnail_path ? thumbnails?.[r.thumbnail_path] : undefined}
                    />
                  ))}
                </ListPanel>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: spacing.titleTop },
  // The pill row scrolls to the screen edges but starts in line with the field.
  pills: { flexGrow: 0, marginTop: search.fieldToPills, marginHorizontal: -spacing.screen },
  pillRow: { gap: sheet.pillGap, paddingHorizontal: spacing.screen },
  results: { flex: 1 },
  resultsContent: { paddingBottom: spacing.sectionGapLarge },
  message: { marginTop: search.pillsToCount, paddingHorizontal: spacing.titleInset },
  count: {
    marginTop: search.pillsToCount,
    marginBottom: search.countToResults,
    paddingHorizontal: spacing.titleInset,
  },
  stale: { opacity: 0.6 },
  list: { marginTop: search.bestMatchToList },
});
