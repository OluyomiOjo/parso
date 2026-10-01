import { router } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { CollectionCard } from '@/components/CollectionCard';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { Text } from '@/components/Text';
import { useCollectionOverview } from '@/lib/collections';
import { useThumbnailUrls } from '@/lib/saves';
import { card, colors, spacing } from '@/theme';

export default function CollectionsScreen() {
  const { data: collections, isPending, isError, isRefetching, refetch } = useCollectionOverview();
  const { data: thumbnails } = useThumbnailUrls(
    (collections ?? []).flatMap((c) => c.recent.flatMap((t) => (t.thumbnail_path ? [t.thumbnail_path] : []))),
  );
  const { width } = useWindowDimensions();
  const cardWidth = (width - 2 * spacing.screen - card.gap) / 2;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <ScreenTitle>Collections</ScreenTitle>
        {isPending ? (
          <ActivityIndicator style={styles.section} color={colors.secondary} />
        ) : isError && !collections ? (
          <Text variant="secondary" color={colors.secondary} style={styles.message}>
            Couldn't load your collections. Pull down to try again.
          </Text>
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

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.sectionGapLarge },
  section: { marginTop: spacing.sectionGapLarge },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: card.gap },
  message: { marginTop: spacing.sectionGapLarge, paddingHorizontal: spacing.titleInset },
});
