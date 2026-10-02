import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CollectionPills } from '@/components/CollectionPills';
import { RemindMe } from '@/components/RemindMe';
import { SavedTo } from '@/components/SavedTo';
import { SheetPreview } from '@/components/SheetPreview';
import { Text } from '@/components/Text';
import { useCollections, useCreateCollection } from '@/lib/collections';
import { useSave, useThumbnailUrls, useUpdateSave } from '@/lib/saves';
import { colors, radius, sheet, size, type } from '@/theme';

// The save sheet: opened after sharing into Parso or pasting a copied link. existing=1 when the link was
// already saved, so the header says "Already in …" and nothing was saved twice.
export default function SaveSheet() {
  const { id, shared, existing } = useLocalSearchParams<{ id: string; shared?: string; existing?: string }>();
  const { data: save } = useSave(id);
  const { data: collections = [] } = useCollections();
  const { data: thumbnails } = useThumbnailUrls(save?.thumbnail_path ? [save.thumbnail_path] : []);
  const updateSave = useUpdateSave(id);
  const createCollection = useCreateCollection();
  const [note, setNote] = useState<string | null>(null);

  const collection = collections.find((c) => c.id === save?.collection_id) ?? null;
  const filed = Boolean(save?.processed_at && collection);

  const done = () => {
    const trimmed = note?.trim() ?? '';
    if (note !== null && trimmed !== (save?.note ?? '')) updateSave.mutate({ note: trimmed || null });
    // On Android, closing Parso returns to the app the person shared from. iOS has no such call;
    // the system's "◀ App" link at the top-left goes back.
    if (shared === '1' && Platform.OS === 'android') BackHandler.exitApp();
    else router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {save ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <SheetPreview
            save={save}
            thumbnailUrl={save.thumbnail_path ? thumbnails?.[save.thumbnail_path] : undefined}
          />
          <View style={styles.savedTo}>
            <SavedTo collection={filed ? collection!.name : null} existing={existing === '1'} />
          </View>
          {filed ? (
            <>
              <View style={styles.pills}>
                <CollectionPills
                  collections={collections}
                  selectedId={save.collection_id}
                  onSelect={(collectionId) => updateSave.mutate({ collection_id: collectionId })}
                  edgeInset={sheet.paddingX}
                  onCreate={(name) =>
                    createCollection.mutate(name, { onSuccess: (c) => updateSave.mutate({ collection_id: c.id }) })
                  }
                />
              </View>
              {save.tags.length ? (
                <Text variant="secondary" color={colors.secondary} style={styles.tags}>
                  Tagged {save.tags.join(', ')}
                </Text>
              ) : null}
            </>
          ) : null}
          <View style={styles.remind}>
            <RemindMe save={save} track />
          </View>
          <View style={styles.noteBlock}>
            <Text variant="sheetLabel" accessibilityRole="header">
              Note
            </Text>
            <TextInput
              value={note ?? save.note ?? ''}
              onChangeText={setNote}
              placeholder="Why you saved it (optional)"
              placeholderTextColor={colors.secondary}
              accessibilityLabel="Note"
              returnKeyType="done"
              style={styles.note}
            />
          </View>
        </ScrollView>
      ) : (
        <ActivityIndicator style={styles.loading} color={colors.secondary} />
      )}
      <View style={styles.footer}>
        <Button label="Done" onPress={done} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: sheet.paddingX, paddingTop: sheet.paddingTop },
  savedTo: { marginTop: sheet.previewToSavedTo },
  pills: { marginTop: sheet.savedToToPills, marginHorizontal: -sheet.paddingX },
  tags: { marginTop: sheet.pillsToTags },
  remind: { marginTop: sheet.tagsToNote },
  noteBlock: { marginTop: sheet.tagsToNote, gap: sheet.labelToField },
  note: {
    height: sheet.noteHeight,
    borderRadius: radius.button,
    borderWidth: size.hairline,
    borderColor: colors.controlBorder,
    paddingHorizontal: sheet.paddingX - 4,
    fontFamily: type.body.fontFamily,
    fontSize: type.body.fontSize,
    color: colors.ink,
  },
  loading: { flex: 1 },
  footer: { paddingHorizontal: sheet.paddingX, paddingBottom: sheet.bottom },
});
