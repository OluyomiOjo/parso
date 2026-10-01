import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { KindFilter, type KindOption } from '@/components/KindFilter';
import { ListPanel } from '@/components/ListPanel';
import { SaveRow } from '@/components/SaveRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { ChevronLeftIcon } from '@/icons/ChevronLeftIcon';
import { PencilIcon } from '@/icons/PencilIcon';
import { useCollectionSummary } from '@/lib/collections';
import { KIND_FILTERS, saveCount } from '@/lib/format';
import { useCollectionSaves, useThumbnailUrls } from '@/lib/saves';
import { collectionScreen, colors, size, spacing } from '@/theme';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/collections'));

export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: collection } = useCollectionSummary(id);
  const { data: saves, isPending, isError, isRefetching, refetch } = useCollectionSaves(id);
  const { data: thumbnails } = useThumbnailUrls(
    (saves ?? []).flatMap((save) => (save.thumbnail_path ? [save.thumbnail_path] : [])),
  );
  const [kind, setKind] = useState<string | null>(null);

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
  const description = collection?.description ? `${count}. ${collection.description}` : `${count}.`;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={styles.header}>
          <IconButton label="Back" onPress={goBack}>
            <ChevronLeftIcon color={colors.ink} size={size.iconButtonIcon} strokeWidth={size.iconStroke} />
          </IconButton>
          {collection ? (
            <IconButton label="Rename collection" onPress={() => router.push(`/collection-rename/${id}`)}>
              <PencilIcon color={colors.ink} size={size.iconButtonIcon} strokeWidth={size.iconStroke} />
            </IconButton>
          ) : null}
        </View>

        <Text variant="screenTitle" accessibilityRole="header" style={styles.title}>
          {collection?.name ?? ''}
        </Text>
        {collection ? (
          <Text variant="body" color={colors.secondary} style={styles.description}>
            {description}
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
            <ListPanel>
              {shown.map((save) => (
                <SaveRow
                  key={save.id}
                  save={save}
                  thumbnailUrl={save.thumbnail_path ? thumbnails?.[save.thumbnail_path] : undefined}
                />
              ))}
            </ListPanel>
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
  content: { paddingBottom: spacing.sectionGapLarge },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.titleTop,
  },
  title: { marginTop: collectionScreen.headerToTitle, paddingHorizontal: spacing.titleInset },
  description: { marginTop: collectionScreen.titleToDescription, paddingHorizontal: spacing.titleInset },
  filter: { marginTop: collectionScreen.descriptionToFilter },
  list: { marginTop: collectionScreen.filterToList },
  message: { marginTop: collectionScreen.filterToList, paddingHorizontal: spacing.titleInset },
});
