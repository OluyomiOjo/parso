import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { CollectionCard } from '@/components/CollectionCard';
import { FirstSaveCard } from '@/components/FirstSaveCard';
import { IconButton } from '@/components/IconButton';
import { NewScreenshotsCard } from '@/components/NewScreenshotsCard';
import { ListPanel } from '@/components/ListPanel';
import { PasteLinkButton } from '@/components/PasteLinkButton';
import { ReminderCard } from '@/components/ReminderCard';
import { SaveGrid } from '@/components/SaveGrid';
import { SaveRow } from '@/components/SaveRow';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { Text } from '@/components/Text';
import { ViewSwitch } from '@/components/ViewSwitch';
import { PlusIcon } from '@/icons/PlusIcon';
import { useCollectionOverview } from '@/lib/collections';
import { useUpcomingReminders } from '@/lib/reminders';
import { useViewMode } from '@/lib/viewMode';
import { useSaves, useSavesLiveUpdates, useThumbnailUrls } from '@/lib/saves';
import { useNewScreenshots } from '@/lib/screenshots';
import { card, colors, firstRun, size, spacing } from '@/theme';

const openAdd = () => router.push('/add');
const openCollections = () => router.navigate('/collections');

export default function HomeScreen() {
  const { data: saves, isPending, isError, isRefetching, refetch } = useSaves();
  const { data: collections, refetch: refetchCollections } = useCollectionOverview();
  // Checked again on screen, so a reminder left over from before the app went to the background never shows.
  const upcoming = (useUpcomingReminders().data ?? []).filter((r) => new Date(r.reminder_at) > new Date());
  const { mode: viewMode } = useViewMode();
  const shots = useNewScreenshots();
  // Picks up a change made on the You tab (screenshot check turned on or off).
  useFocusEffect(useCallback(() => shots.refresh(), [shots.refresh]));
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
              <IconButton label="Add to Parso" onPress={openAdd} variant="ink">
                <PlusIcon color={colors.onInk} size={size.addButtonIcon} strokeWidth={size.addButtonStroke} />
              </IconButton>
            </View>
          ) : null}
        </View>

        {/* New screenshots waiting to be saved. A copied link is offered in its own mini sheet (copied-link). */}
        {['ask', 'needsFullAccess', 'new'].includes(shots.state.status) ? (
          <View style={styles.section}>
            <NewScreenshotsCard
              state={shots.state}
              saving={shots.saving}
              onTurnOn={shots.turnOn}
              onNotNow={shots.notNow}
              onSave={shots.saveAll}
              onChanged={shots.refresh}
            />
          </View>
        ) : null}

        {isPending ? (
          <ActivityIndicator style={styles.section} color={colors.secondary} />
        ) : isError && !saves ? (
          <Text variant="secondary" color={colors.secondary} style={styles.section}>
            Couldn't load your saves. Pull down to try again.
          </Text>
        ) : hasSaves ? (
          <>
            {upcoming.length ? (
              <View style={styles.section}>
                <ReminderCard save={upcoming[0]} more={upcoming.length - 1} />
              </View>
            ) : null}
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
              <View style={[styles.heading, styles.recentRow]}>
                <Text variant="sectionHeading" accessibilityRole="header">
                  Recent
                </Text>
                <ViewSwitch />
              </View>
              {viewMode === 'grid' ? (
                <SaveGrid saves={saves!} thumbnails={thumbnails} />
              ) : (
                <ListPanel>
                  {saves!.map((save) => (
                    <SaveRow
                      key={save.id}
                      save={save}
                      thumbnailUrl={save.thumbnail_path ? thumbnails?.[save.thumbnail_path] : undefined}
                    />
                  ))}
                </ListPanel>
              )}
            </View>
          </>
        ) : (
          <View style={styles.section}>
            <FirstSaveCard />
            <View style={styles.paste}>
              <PasteLinkButton onPress={openAdd} />
            </View>
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
    marginTop: spacing.titleTop - (size.addButton - size.iconButton) / 2, // centred where the 40pt button sat
    marginRight: spacing.titleInset,
  },
  section: { marginTop: spacing.sectionGapLarge },
  paste: { marginTop: firstRun.cardToPaste },
  heading: {
    paddingHorizontal: spacing.titleInset,
    marginBottom: spacing.headingToPanel,
  },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  recentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  // The card row scrolls to the screen edges but starts in line with the content.
  bleed: { marginHorizontal: -spacing.screen },
  cards: { gap: card.gap, paddingHorizontal: spacing.screen },
});
