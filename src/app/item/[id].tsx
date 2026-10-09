import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DetailActions } from '@/components/DetailActions';
import { DetailsPanel } from '@/components/DetailsPanel';
import { IconButton } from '@/components/IconButton';
import { Pill } from '@/components/Pill';
import { SourceLine } from '@/components/SourceLine';
import { Text } from '@/components/Text';
import { ChevronLeftIcon } from '@/icons/ChevronLeftIcon';
import { useCollections } from '@/lib/collections';
import { metaLabel, MONTHS, openLabel, relativeTime } from '@/lib/format';
import { displayUrl } from '@/lib/links';
import { addPreviewImage } from '@/lib/previewImage';
import { shortReminder } from '@/lib/reminderTime';
import { DELETE_FAILED, useDeleteSave, useMarkDone, useSave, useThumbnailUrls } from '@/lib/saves';
import { track } from '@/lib/track';
import { doneLabel } from '@/lib/week';
import { colors, detail, size, spacing, week } from '@/theme';

const OPEN_FAILED = "Couldn't open this link. Check that the app is installed, or try again.";
const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
// Website saves already looked up on this phone this session, so the page isn't fetched on every visit.
const lookedUp = new Set<string>();

export default function SaveDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: save, isError } = useSave(id);
  const { data: collections = [] } = useCollections();
  const { data: thumbnails } = useThumbnailUrls(save?.thumbnail_path ? [save.thumbnail_path] : []);
  const deleteSave = useDeleteSave(save);
  const markDone = useMarkDone(id);
  const setDone = (done: boolean) => markDone.mutate(done, { onError: (error) => Alert.alert(error.message) });

  // Older website saves with no picture (sites that refuse our server, like Medium): look on the phone.
  // One "save opened" per visit, with its source and kind (never its content).
  const openedKind = save?.kind;
  const openedSource = save?.source;
  useEffect(() => {
    if (openedKind && openedSource && openedKind !== 'text')
      track('save_opened', { kind: openedKind, source: openedSource });
  }, [id, openedKind, openedSource]);

  // Notes open in the note editor; this catches links that only know the id (a reminder notification).
  const isNote = save?.kind === 'text';
  useEffect(() => {
    if (isNote) router.replace({ pathname: '/note/[id]', params: { id } });
  }, [isNote, id]);

  const needsPicture = Boolean(save?.processed_at && !save.thumbnail_path && !save.preview_image_url);
  useEffect(() => {
    if (!save || !needsPicture || lookedUp.has(save.id)) return;
    lookedUp.add(save.id);
    void addPreviewImage(save);
  }, [save, needsPicture]);

  const back = (
    <IconButton label="Back" onPress={goBack}>
      <ChevronLeftIcon color={colors.ink} size={size.iconButtonIcon} strokeWidth={size.iconStroke} />
    </IconButton>
  );

  if (!save || isNote) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + detail.headerTop }]}>
        <View style={styles.inlineHeader}>{back}</View>
        {isError ? (
          <Text variant="secondary" color={colors.secondary} style={styles.message}>
            Couldn't load this save. It may have been deleted. Go back and pull down to refresh.
          </Text>
        ) : (
          <ActivityIndicator style={styles.message} color={colors.secondary} />
        )}
      </View>
    );
  }

  const imageUrl = save.thumbnail_path ? thumbnails?.[save.thumbnail_path] : undefined;
  const hasImage = Boolean(save.thumbnail_path);
  const title = save.title ?? (save.url ? displayUrl(save.url) : 'Saving…');
  const collection = collections.find((c) => c.id === save.collection_id);
  const open = openLabel(save.kind, save.source, save.url);
  const edit = (field: 'collection' | 'tags' | 'reminder' | 'note') =>
    router.push({
      pathname: '/item-edit/[id]',
      params: { id: save.id, field },
    });

  const confirmDelete = () =>
    Alert.alert('Delete this save?', "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteSave.mutate(undefined, {
            onSuccess: goBack,
            onError: () => Alert.alert(DELETE_FAILED),
          }),
      },
    ]);

  const openPhoto = () => router.push({ pathname: '/photo/[id]', params: { id: save.id } });

  const openSource = () => {
    if (save.url) Linking.openURL(save.url).catch(() => Alert.alert(OPEN_FAILED));
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={!hasImage && { paddingTop: insets.top + detail.headerTop }}
        showsVerticalScrollIndicator={false}
      >
        {hasImage ? (
          <View style={styles.imageBox}>
            {imageUrl ? (
              // Tap the picture to see it whole, full screen (photos at their original size).
              <Pressable
                onPress={openPhoto}
                accessibilityRole="imagebutton"
                accessibilityLabel="Open picture full screen"
                style={styles.image}
              >
                <Image source={{ uri: imageUrl }} style={styles.image} accessibilityIgnoresInvertColors />
              </Pressable>
            ) : null}
            <View style={[styles.overlayHeader, { top: insets.top + detail.headerTop }]}>{back}</View>
          </View>
        ) : (
          <View style={styles.inlineHeader}>{back}</View>
        )}

        <View style={styles.body}>
          <SourceLine
            kind={save.kind}
            source={save.source}
            text={`${metaLabel(save)}, saved ${relativeTime(save.created_at)}`}
          />
          <Text variant="detailTitle" accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {save.summary ? <Text style={styles.summary}>{save.summary}</Text> : null}
          {save.kind === 'text' && save.raw_text ? (
            <Text color={colors.secondary} style={styles.summary}>
              {save.raw_text}
            </Text>
          ) : null}

          {/* What the person meant to do with it (the AI's question), and Done (Your week in Parso). */}
          <View style={styles.next}>
            {save.done_at ? (
              <View style={styles.doneRow}>
                <Text variant="secondary" color={colors.secondary}>
                  {doneLabel(save.done_at, MONTHS)}
                </Text>
                <Pressable onPress={() => setDone(false)} accessibilityRole="button" hitSlop={spacing.sm}>
                  <Text variant="secondary" style={styles.link}>
                    Undo
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                {save.next_step ? <Text>{save.next_step}</Text> : null}
                <View style={styles.doneButton}>
                  <Pill label="Mark as done" onPress={() => setDone(true)} />
                </View>
              </>
            )}
          </View>

          <View style={styles.panel}>
            <DetailsPanel
              rows={[
                {
                  label: 'Collection',
                  value: collection?.name ?? null,
                  placeholder: 'Choose',
                  onPress: () => edit('collection'),
                },
                {
                  label: 'Tags',
                  value: save.tags.length ? save.tags.join(', ') : null,
                  placeholder: 'Add tags',
                  onPress: () => edit('tags'),
                },
                {
                  label: 'Reminder',
                  value: save.reminder_at ? shortReminder(new Date(save.reminder_at)) : null,
                  placeholder: 'Off',
                  onPress: () => edit('reminder'),
                },
                {
                  label: 'Note',
                  value: save.note,
                  placeholder: 'Add a note',
                  onPress: () => edit('note'),
                },
              ]}
            />
          </View>

          <Pressable
            onPress={confirmDelete}
            disabled={deleteSave.isPending}
            accessibilityRole="button"
            hitSlop={spacing.sm}
            style={styles.delete}
          >
            <Text variant="secondary" color={colors.secondary}>
              {deleteSave.isPending ? 'Deleting…' : 'Delete save'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={[styles.buttonArea, { paddingBottom: insets.bottom + detail.bottom }]}>
        <DetailActions save={save} openLabel={open} onOpenSource={openSource} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  imageBox: { height: detail.imageHeight, backgroundColor: colors.divider },
  image: { width: '100%', height: '100%' },
  overlayHeader: { position: 'absolute', left: spacing.screen },
  inlineHeader: { paddingHorizontal: spacing.screen, alignItems: 'flex-start' },
  body: {
    paddingHorizontal: spacing.screen,
    paddingTop: detail.imageToMeta,
    paddingBottom: spacing.sectionGapLarge,
  },
  title: { marginTop: detail.metaToTitle },
  summary: { marginTop: detail.titleToSummary },
  panel: { marginTop: detail.summaryToPanel },
  next: { marginTop: week.doneTop, gap: week.actionGap },
  doneButton: { flexDirection: 'row' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: week.doneGap },
  link: { textDecorationLine: 'underline' },
  delete: {
    marginTop: detail.panelToDelete,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.titleInset,
    alignSelf: 'flex-start',
  },
  message: {
    marginTop: spacing.sectionGapLarge,
    paddingHorizontal: spacing.screen,
  },
  buttonArea: {
    paddingHorizontal: spacing.screen,
    paddingTop: detail.buttonAreaTop,
    backgroundColor: colors.background,
  },
});
