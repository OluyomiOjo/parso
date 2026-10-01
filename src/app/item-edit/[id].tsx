import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CollectionPills } from '@/components/CollectionPills';
import { TagEditor } from '@/components/TagEditor';
import { Text } from '@/components/Text';
import { useCollections, useCreateCollection } from '@/lib/collections';
import { useSave, useUpdateSave } from '@/lib/saves';
import { colors, detail, radius, sheet, size, spacing, type } from '@/theme';

type Field = 'collection' | 'tags' | 'note';
const TITLES: Record<Field, string> = { collection: 'Collection', tags: 'Tags', note: 'Note' };
const SAVE_FAILED = "Couldn't save the change. Check your connection and tap Save again.";

// One sheet for the three things a person can change on the detail page.
export default function EditSaveScreen() {
  const { id, field = 'note' } = useLocalSearchParams<{ id: string; field?: Field }>();
  const { data: save } = useSave(id);
  const { data: collections = [] } = useCollections();
  const createCollection = useCreateCollection();
  const updateSave = useUpdateSave(id);
  const [tags, setTags] = useState<string[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const done = () => {
    const changes =
      field === 'tags' && tags !== null
        ? { tags }
        : field === 'note' && note !== null
          ? { note: note.trim() || null }
          : null;
    if (!changes) return router.back();
    setError(null);
    updateSave.mutate(changes, { onSuccess: () => router.back(), onError: () => setError(SAVE_FAILED) });
  };

  return (
    <SafeAreaView style={styles.sheet} edges={['bottom']}>
      <View style={styles.content}>
        <Text variant="sheetTitle" accessibilityRole="header">
          {TITLES[field] ?? TITLES.note}
        </Text>

        {save && field === 'collection' ? (
          <View style={[styles.block, styles.pills]}>
            <CollectionPills
              collections={collections}
              selectedId={save.collection_id}
              edgeInset={sheet.paddingX}
              onSelect={(collectionId) => updateSave.mutate({ collection_id: collectionId })}
              onCreate={(name) =>
                createCollection.mutate(name, { onSuccess: (c) => updateSave.mutate({ collection_id: c.id }) })
              }
            />
          </View>
        ) : null}

        {save && field === 'tags' ? (
          <View style={styles.block}>
            <TagEditor tags={tags ?? save.tags} onChange={setTags} />
          </View>
        ) : null}

        {save && field === 'note' ? (
          <TextInput
            value={note ?? save.note ?? ''}
            onChangeText={setNote}
            placeholder="Why you saved it"
            placeholderTextColor={colors.secondary}
            multiline
            autoFocus
            textAlignVertical="top"
            accessibilityLabel="Note"
            style={[styles.block, styles.note]}
          />
        ) : null}

        {error ? (
          <Text variant="secondary" style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
      </View>
      <View style={styles.footer}>
        <Button label={field === 'collection' ? 'Done' : 'Save'} onPress={done} busy={updateSave.isPending} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingTop: spacing.sheetTop, paddingHorizontal: sheet.paddingX },
  block: { marginTop: spacing.sectionGap },
  // The pill row scrolls edge to edge, so it undoes the sheet's side padding.
  pills: { marginHorizontal: -sheet.paddingX },
  note: {
    height: detail.noteHeight,
    borderRadius: radius.button,
    borderWidth: size.hairline,
    borderColor: colors.controlBorder,
    backgroundColor: colors.surface,
    padding: spacing.fieldPaddingX,
    fontFamily: type.body.fontFamily,
    fontSize: type.body.fontSize,
    color: colors.ink,
  },
  error: { marginTop: spacing.errorTop },
  footer: { paddingHorizontal: sheet.paddingX, paddingBottom: sheet.bottom },
});
