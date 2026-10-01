import { router } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { CollectionCard } from '@/components/CollectionCard';
import { IconButton } from '@/components/IconButton';
import { ListPanel } from '@/components/ListPanel';
import { PasteLinkButton } from '@/components/PasteLinkButton';
import { SaveRow } from '@/components/SaveRow';
import { SearchFieldButton } from '@/components/SearchField';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { Text } from '@/components/Text';
import { LinkIcon } from '@/icons/LinkIcon';
import { useCollectionOverview } from '@/lib/collections';
import { useSaves, useSavesLiveUpdates, useThumbnailUrls } from '@/lib/saves';
import { card, colors, size, spacing } from '@/theme';

const openPaste = () => router.push('/paste');
const openCollections = () => router.navigate('/collections');
const openSearch = () => router.navigate('/search');

export default function HomeScreen() {
  const { data: saves, isPending, isError, isRefetching, refetch } = useSaves();
  const { data: collections, refetch: refetchCollections } = useCollectionOverview();
  useSavesLiveUpdates();
  // One signing request for the list and the collection tiles together.
  const { data: thumbnails } = useThumbnailUrls([
    ...(saves ?? []).flatMap((save) => (save.thumbnail_path ? [save.thumbnail_path] : [])),
    ...(collections ?? []).flatMap((c) => c.recent.flatMap((t) => (t.thumbnail_path ? [t.thumbnail_path] : []))),
  ]);
  const refresh = () => {
    refetch();
    refetchCollections();
  };
  const hasSaves = (saves?.length ?? 0) > 0;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refresh} />}
      >
        <View style={styles.header}>
          <ScreenTitle>My Parsos</ScreenTitle>
          {hasSaves ? (
            <View style={styles.headerButton}>
              <IconButton label="Paste a link" onPress={openPaste}>
                <LinkIcon color={colors.ink} size={size.iconButtonIcon} strokeWidth={size.iconStroke} />
              </IconButton>
            </View>
          ) : null}
        </View>

        {isPending ? (
          <ActivityIndicator style={styles.section} color={colors.secondary} />
        ) : isError && !saves ? (
          <Text variant="secondary" color={colors.secondary} style={styles.section}>
            Couldn't load your saves. Pull down to try again.
          </Text>
        ) : hasSaves ? (
          <>
            <View style={styles.section}>
              <SearchFieldButton onPress={openSearch} />
            </View>
            {collections?.length ? (
              <View style={styles.section}>
                <View style={[styles.heading, styles.headingRow]}>
                  <Text variant="sectionHeading" accessibilityRole="header">
                    Collections
                  </Text>
                  <Pressable onPress={openCollections} accessibilityRole="link" hitSlop={spacing.sm}>
                    <Text variant="secondary" color={colors.secondary}>
                      See all
                    </Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.bleed}
                  contentContainerStyle={styles.cards}
                >
                  {collections.map((c) => (
                    <CollectionCard
                      key={c.id}
                      collection={c}
                      thumbnails={thumbnails}
                      onPress={() => router.push(`/collections/${c.id}`)}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}
            <View style={styles.section}>
              <Text variant="sectionHeading" accessibilityRole="header" style={styles.heading}>
                Recent
              </Text>
              <ListPanel>
                {saves!.map((save) => (
                  <SaveRow
                    key={save.id}
                    save={save}
                    thumbnailUrl={save.thumbnail_path ? thumbnails?.[save.thumbnail_path] : undefined}
                  />
                ))}
              </ListPanel>
            </View>
          </>
        ) : (
          <View style={styles.section}>
            <PasteLinkButton onPress={openPaste} />
          </View>
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
    alignItems: 'flex-start',
  },
  headerButton: {
    marginTop: spacing.titleTop,
    marginRight: spacing.titleInset,
  },
  section: { marginTop: spacing.sectionGapLarge },
  heading: {
    paddingHorizontal: spacing.titleInset,
    marginBottom: spacing.headingToPanel,
  },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  // The card row scrolls to the screen edges but starts in line with the content.
  bleed: { marginHorizontal: -spacing.screen },
  cards: { gap: card.gap, paddingHorizontal: spacing.screen },
});
