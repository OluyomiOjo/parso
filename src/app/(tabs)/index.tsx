import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { CollectionCircle } from '@/components/CollectionCircle';
import { FirstSaveCard } from '@/components/FirstSaveCard';
import { NewScreenshotsCard } from '@/components/NewScreenshotsCard';
import { ListPanel } from '@/components/ListPanel';
import { NoteRow } from '@/components/NoteRow';
import { PasteLinkButton } from '@/components/PasteLinkButton';
import { Pill } from '@/components/Pill';
import { RemindersBell } from '@/components/RemindersBell';
import { ReorderList } from '@/components/ReorderList';
import { SaveGrid } from '@/components/SaveGrid';
import { SaveRow } from '@/components/SaveRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { ViewSwitch } from '@/components/ViewSwitch';
import { WeekCard } from '@/components/WeekCard';
import { REORDER_FAILED, useCollectionOverview, useReorderCollections } from '@/lib/collections';
import { useNotes } from '@/lib/notes';
import { canSave, openUpgrade } from '@/lib/pro';
import { useViewMode } from '@/lib/viewMode';
import { useSaves, useSavesLiveUpdates, useThumbnailUrls } from '@/lib/saves';
import { useNewScreenshots } from '@/lib/screenshots';
import { useWeekCard } from '@/lib/weekData';
import { circle, colors, firstRun, homeLogo, sheet, size, spacing, type, welcome } from '@/theme';

const openAdd = () => router.push('/add');
const openNewNote = () => router.push({ pathname: '/note/[id]', params: { id: 'new' } });
const newNote = () => void canSave().then((ok) => (ok ? openNewNote() : openUpgrade(openNewNote)));

type Filter = 'all' | 'notes';
const CIRCLE_ROW_HEIGHT = circle.size + circle.nameTop + type.meta.lineHeight;
const openCollections = () => router.navigate('/collections');

export default function HomeScreen() {
  const { data: saves, isPending, isError, isRefetching, refetch } = useSaves();
  const { data: collections, refetch: refetchCollections } = useCollectionOverview();
  const { mode: viewMode } = useViewMode();
  const [filter, setFilter] = useState<Filter>('all');
  const reorderCollections = useReorderCollections();
  const [dragging, setDragging] = useState(false); // the page and the circle row hold still while a circle moves
  const notes = useNotes(filter === 'notes');
  const shots = useNewScreenshots();
  const weekReady = useWeekCard();
  // Picks up a change made on the You tab (screenshot check turned on or off).
  useFocusEffect(useCallback(() => shots.refresh(), [shots.refresh]));
  useSavesLiveUpdates();
  // One signing request for the list and the collection tiles together.
  const { data: thumbnails } = useThumbnailUrls([
    ...(saves ?? []).flatMap((save) => (save.thumbnail_path ? [save.thumbnail_path] : [])),
    ...(collections ?? []).flatMap((c) => (c.cover ? [c.cover] : [])),
  ]);
  const refresh = () => {
    refetch();
    refetchCollections();
    if (filter === 'notes') notes.refetch();
  };
  const hasSaves = (saves?.length ?? 0) > 0;

  return (
    <Screen>
      <ScrollView
        scrollEnabled={!dragging}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refresh} />}
      >
        <View style={styles.header}>
          {/* The logo in solid black (the brand file, tinted), in place of a title; the screen is called Parsos. */}
          <Image
            source={require('../../../assets/brand/parso_logo_new.png')}
            style={styles.logo}
            tintColor={colors.ink}
            resizeMode="contain"
            accessibilityRole="header"
            accessibilityLabel="Parsos"
          />
          <View style={styles.bell}>
            <RemindersBell />
          </View>
        </View>

        {weekReady && hasSaves ? (
          <View style={styles.section}>
            <WeekCard />
          </View>
        ) : null}

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
                  scrollEnabled={!dragging}
                  showsHorizontalScrollIndicator={false}
                  style={styles.bleed}
                  contentContainerStyle={styles.circles}
                >
                  <ReorderList
                    horizontal
                    items={collections}
                    keyOf={(c) => c.id}
                    extent={circle.nameWidth + circle.gap}
                    crossSize={CIRCLE_ROW_HEIGHT}
                    renderItem={(c) => (
                      <CollectionCircle
                        collection={c}
                        coverUrl={c.cover ? thumbnails?.[c.cover] : undefined}
                        onOpen={() => router.push(`/collections/${c.id}`)}
                      />
                    )}
                    onPress={(c) => router.push(`/collections/${c.id}`)}
                    onReorder={(ids) => reorderCollections.mutate(ids, { onError: () => Alert.alert(REORDER_FAILED) })}
                    onDragChange={setDragging}
                  />
                </ScrollView>
              </View>
            ) : null}
            <View style={styles.section}>
              <View style={styles.filters}>
                <Pill label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
                <Pill label="Notes" selected={filter === 'notes'} onPress={() => setFilter('notes')} />
              </View>
              <View style={[styles.heading, styles.recentRow]}>
                <Text variant="sectionHeading" accessibilityRole="header">
                  {filter === 'notes' ? 'Notes' : 'Recent'}
                </Text>
                {filter === 'all' ? <ViewSwitch /> : null}
              </View>
              {filter === 'notes' ? (
                notes.isPending ? (
                  <ActivityIndicator color={colors.secondary} />
                ) : notes.data?.length ? (
                  <ListPanel>
                    {notes.data.map((save) => (
                      <NoteRow key={save.id} save={save} />
                    ))}
                  </ListPanel>
                ) : (
                  <Pressable onPress={newNote} accessibilityRole="button" style={styles.emptyNotes}>
                    <Text variant="secondary" color={colors.secondary}>
                      {notes.isError
                        ? "Couldn't load your notes. Pull down to try again."
                        : 'No notes yet. Tap here, or + then Note, to write one.'}
                    </Text>
                  </Pressable>
                )
              ) : viewMode === 'grid' ? (
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
  content: { paddingBottom: spacing.sectionGapLarge + size.addButtonClearance },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logo: {
    height: homeLogo.height,
    width: homeLogo.height * welcome.logoAspect,
    marginTop: homeLogo.top,
    marginBottom: homeLogo.bottom,
    marginLeft: spacing.titleInset,
  },
  // Centred on the logo: the logo sits homeLogo.top down and is homeLogo.height tall.
  bell: { marginTop: homeLogo.top + (homeLogo.height - size.minTouch) / 2 },
  section: { marginTop: spacing.sectionGapLarge },
  filters: { flexDirection: 'row', gap: sheet.pillGap, marginBottom: spacing.sectionGap },
  emptyNotes: { paddingHorizontal: spacing.titleInset, paddingVertical: spacing.sm },
  paste: { marginTop: firstRun.cardToPaste },
  heading: {
    paddingHorizontal: spacing.titleInset,
    marginBottom: spacing.headingToPanel,
  },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  recentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  // The circle row scrolls to the screen edges but starts in line with the content.
  bleed: { marginHorizontal: -spacing.screen },
  circles: { paddingHorizontal: spacing.screen },
});
