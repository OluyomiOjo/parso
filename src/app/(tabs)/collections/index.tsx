import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { CollectionCard } from '@/components/CollectionCard';
import { ReorderList } from '@/components/ReorderList';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { Text } from '@/components/Text';
import { CollectionsIcon } from '@/icons/CollectionsIcon';
import { DragHandleIcon } from '@/icons/DragHandleIcon';
import {
  REORDER_FAILED,
  useCollectionOverview,
  useReorderCollections,
  type CollectionSummary,
} from '@/lib/collections';
import { saveCount } from '@/lib/format';
import { useThumbnailUrls } from '@/lib/saves';
import { card, colors, radius, reorder, size, spacing, tabularNums } from '@/theme';

export default function CollectionsScreen() {
  const { data: collections, isPending, isError, isRefetching, refetch } = useCollectionOverview();
  const { data: thumbnails } = useThumbnailUrls(
    (collections ?? []).flatMap((c) => [
      ...c.recent.flatMap((t) => (t.thumbnail_path ? [t.thumbnail_path] : [])),
      ...(c.cover ? [c.cover] : []),
    ]),
  );
  const reorderCollections = useReorderCollections();
  const [reordering, setReordering] = useState(false);
  const [dragging, setDragging] = useState(false);
  const { width } = useWindowDimensions();
  const cardWidth = (width - 2 * spacing.screen - card.gap) / 2;
  const canReorder = (collections?.length ?? 0) > 1;

  return (
    <Screen>
      <ScrollView
        scrollEnabled={!dragging}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={reordering ? undefined : <RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={styles.header}>
          <ScreenTitle>Collections</ScreenTitle>
          {canReorder ? (
            <Pressable
              onPress={() => setReordering((on) => !on)}
              accessibilityRole="button"
              hitSlop={spacing.sm}
              style={styles.reorderButton}
            >
              <Text variant={reordering ? 'button' : 'secondary'} color={reordering ? colors.ink : colors.secondary}>
                {reordering ? 'Done' : 'Reorder'}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {isPending ? (
          <ActivityIndicator style={styles.section} color={colors.secondary} />
        ) : isError && !collections ? (
          <Text variant="secondary" color={colors.secondary} style={styles.message}>
            Couldn't load your collections. Pull down to try again.
          </Text>
        ) : collections?.length && reordering ? (
          <>
            <Text variant="secondary" color={colors.secondary} style={styles.hint}>
              Press and hold a collection, then drag it. My Parsos shows them in this order.
            </Text>
            <View style={[styles.section, styles.panel]}>
              <ReorderList
                items={collections}
                keyOf={(c) => c.id}
                extent={reorder.rowHeight}
                crossSize={width - 2 * spacing.screen}
                renderItem={(c) => <ReorderRow collection={c} thumbnails={thumbnails} />}
                onReorder={(ids) => reorderCollections.mutate(ids, { onError: () => Alert.alert(REORDER_FAILED) })}
                onDragChange={setDragging}
              />
            </View>
          </>
        ) : collections?.length ? (
          <View style={[styles.section, styles.grid]}>
            {collections.map((c) => (
              <CollectionCard
                key={c.id}
                collection={c}
                thumbnails={thumbnails}
                width={cardWidth}
                onPress={() => router.push(`/collections/${c.id}`)}
              />
            ))}
          </View>
        ) : (
          <Text variant="secondary" color={colors.secondary} style={styles.message}>
            No collections yet. Share something to Parso and it's filed into one for you.
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

// One row of the Reorder list: picture, name, count and a drag handle. Each row draws its own divider so the
// rows can move independently.
function ReorderRow({
  collection,
  thumbnails,
}: {
  collection: CollectionSummary;
  thumbnails?: Record<string, string>;
}) {
  const url = collection.cover ? thumbnails?.[collection.cover] : undefined;
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${collection.name}, ${saveCount(collection.saveCount)}`}
      accessibilityHint="Press and hold, then drag to move it."
    >
      {url ? (
        <Image source={{ uri: url }} style={styles.thumb} accessibilityIgnoresInvertColors />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}>
          <CollectionsIcon color={colors.secondary} size={size.thumbIcon} strokeWidth={size.iconStroke} />
        </View>
      )}
      <View style={styles.rowText}>
        <Text variant="rowTitle" numberOfLines={1}>
          {collection.name}
        </Text>
        <Text variant="rowMeta" color={colors.secondary} style={tabularNums}>
          {saveCount(collection.saveCount)}
        </Text>
      </View>
      <DragHandleIcon color={colors.secondary} size={reorder.handle} strokeWidth={size.iconStroke} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.sectionGapLarge + size.addButtonClearance },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  reorderButton: { minHeight: size.minTouch, justifyContent: 'center', paddingHorizontal: spacing.titleInset },
  section: { marginTop: spacing.sectionGapLarge },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: card.gap },
  hint: { marginTop: spacing.sm, paddingHorizontal: spacing.titleInset },
  panel: { backgroundColor: colors.panel, borderRadius: radius.panel, overflow: 'hidden' },
  row: {
    height: reorder.rowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.rowGap,
    paddingHorizontal: spacing.rowPaddingX,
    backgroundColor: colors.panel,
    borderBottomWidth: size.hairline,
    borderBottomColor: colors.divider,
  },
  thumb: { width: reorder.rowThumb, height: reorder.rowThumb, borderRadius: radius.thumb },
  thumbEmpty: { backgroundColor: colors.divider, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  message: { marginTop: spacing.sectionGapLarge, paddingHorizontal: spacing.titleInset },
});
