import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { KindFilter, type KindOption } from '@/components/KindFilter';
import { ListPanel } from '@/components/ListPanel';
import { SaveGrid } from '@/components/SaveGrid';
import { SaveRow } from '@/components/SaveRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { ChevronLeftIcon } from '@/icons/ChevronLeftIcon';
import { GridIcon } from '@/icons/GridIcon';
import { ListIcon } from '@/icons/ListIcon';
import { PencilIcon } from '@/icons/PencilIcon';
import { useCollectionSummary } from '@/lib/collections';
import { KIND_FILTERS, saveCount } from '@/lib/format';
import { usePullToRefresh } from '@/lib/pullToRefresh';
import { useCollectionSaves, useThumbnailUrls } from '@/lib/saves';
import { useViewMode } from '@/lib/viewMode';
import { collectionScreen, colors, size, spacing } from '@/theme';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/collections'));

export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: collection, isSuccess: collectionsLoaded } = useCollectionSummary(id);
  // Its last save was deleted or moved out, so the collection is gone (migration 0029): leave the empty page.
  const gone = collectionsLoaded && !collection;
  useEffect(() => {
    if (gone) goBack();
  }, [gone]);
  const { data: saves, isPending, isError, refetch } = useCollectionSaves(id);
  const pull = usePullToRefresh(refetch);
  const { data: thumbnails } = useThumbnailUrls(
    (saves ?? []).flatMap((save) => (save.thumbnail_path ? [save.thumbnail_path] : [])),
  );
  const [kind, setKind] = useState<string | null>(null);
  const { mode: viewMode, setMode: setViewMode } = useViewMode();

  const all = saves ?? [];
  const kindOptions: KindOption[] = KIND_FILTERS.map((f) => ({
    kind: f.kind,
    label: f.label,
    count: all.filter((s) => s.kind === f.kind).length,
  })).filter((o) => o.count > 0);
  // The filter only helps when there's more than one kind to choose between.
  const options: KindOption[] =
    kindOptions.length > 1 ? [{ kind: null, label: 'All', count: all.length }, ...kindOptions] : [];
  const activeKind = options.some((o) => o.kind === kind) ? kind : null;
  const shown = activeKind ? all.filter((s) => s.kind === activeKind) : all;

  const count = saveCount(collection?.saveCount ?? all.length);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} />}
      >
        <View style={styles.header}>
          <IconButton label="Back" onPress={goBack}>
            <ChevronLeftIcon color={colors.ink} size={size.iconButtonIcon} strokeWidth={size.iconStroke} />
          </IconButton>
          {collection ? (
            <View style={styles.headerActions}>
              {/* Shows the view a tap switches to. */}
              <IconButton
                label={viewMode === 'grid' ? 'List view' : 'Grid view'}
                onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? (
                  <ListIcon color={colors.ink} size={size.iconButtonIcon} strokeWidth={size.iconStroke} />
                ) : (
                  <GridIcon color={colors.ink} size={size.iconButtonIcon} strokeWidth={size.iconStroke} />
                )}
              </IconButton>
              <IconButton label="Rename collection" onPress={() => router.push(`/collection-rename/${id}`)}>
                <PencilIcon color={colors.ink} size={size.iconButtonIcon} strokeWidth={size.iconStroke} />
              </IconButton>
            </View>
          ) : null}
        </View>

        <Text variant="screenTitle" accessibilityRole="header" style={styles.title}>
          {collection?.name ?? ''}
        </Text>
        {collection ? (
          <Text variant="meta" style={styles.count}>
            {count}
          </Text>
        ) : null}

        {options.length ? (
          <View style={styles.filter}>
            <KindFilter options={options} selected={activeKind} onSelect={setKind} />
          </View>
        ) : null}

        {isPending ? (
          <ActivityIndicator style={styles.list} color={colors.secondary} />
        ) : isError && !saves ? (
          <Text variant="secondary" color={colors.secondary} style={styles.message}>
            Couldn't load this collection. Pull down to try again.
          </Text>
        ) : shown.length ? (
          <View style={styles.list}>
            {viewMode === 'grid' ? (
              <SaveGrid saves={shown} thumbnails={thumbnails} />
            ) : (
              <ListPanel>
                {shown.map((save) => (
                  <SaveRow
                    key={save.id}
                    save={save}
                    thumbnailUrl={save.thumbnail_path ? thumbnails?.[save.thumbnail_path] : undefined}
                  />
                ))}
              </ListPanel>
            )}
          </View>
        ) : (
          <Text variant="secondary" color={colors.secondary} style={styles.message}>
            Nothing here yet. Share something to Parso, or move a save here from its sheet.
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.sectionGapLarge + size.addButtonClearance },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.titleTop,
  },
  headerActions: { flexDirection: 'row', gap: collectionScreen.headerButtonGap },
  title: { marginTop: collectionScreen.headerToTitle, paddingHorizontal: spacing.titleInset },
  count: { marginTop: collectionScreen.titleToCount, paddingHorizontal: spacing.titleInset },
  filter: { marginTop: collectionScreen.countToFilter },
  list: { marginTop: collectionScreen.filterToList },
  message: { marginTop: collectionScreen.filterToList, paddingHorizontal: spacing.titleInset },
});
