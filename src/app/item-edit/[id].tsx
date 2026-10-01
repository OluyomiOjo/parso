import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CollectionPills } from '@/components/CollectionPills';
import { RemindMe } from '@/components/RemindMe';
import { TagEditor, withTag } from '@/components/TagEditor';
import { Text } from '@/components/Text';
import { useCollections, useCreateCollection } from '@/lib/collections';
import { useSave, useUpdateSave } from '@/lib/saves';
import { colors, detail, radius, sheet, size, spacing, type } from '@/theme';

type Field = 'collection' | 'tags' | 'reminder' | 'note';
const TITLES: Record<Field, string> = { collection: 'Collection', tags: 'Tags', reminder: 'Reminder', note: 'Note' };
const SAVE_FAILED = "Couldn't save the change. Check your connection and tap Save again.";

// One sheet for the three things a person can change on the detail page.
export default function EditSaveScreen() {
  const { id, field = 'note' } = useLocalSearchParams<{ id: string; field?: Field }>();
  const { data: save } = useSave(id);
  const { data: collections = [] } = useCollections();
  const createCollection = useCreateCollection();
  const updateSave = useUpdateSave(id);
  const [tags, setTags] = useState<string[] | null>(null);
  const [tagDraft, setTagDraft] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const done = () => {
    const finalTags = save ? withTag(tags ?? save.tags, tagDraft) : null;
    const changes =
      field === 'tags' && finalTags && (tags !== null || tagDraft.trim())
        ? { tags: finalTags }
        : field === 'note' && note !== null
          ? { note: note.trim() || null }
          : null;
    if (!changes) return router.back();
    setError(null);
    updateSave.mutate(changes, { onSuccess: () => router.back(), onError: () => setError(SAVE_FAILED) });
  };

  return (
    <View style={styles.sheet}>
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
          <TagEditor tags={tags ?? save.tags} onChange={setTags} draft={tagDraft} onDraftChange={setTagDraft} />
        </View>
      ) : null}

      {save && field === 'reminder' ? (
        <View style={styles.block}>
          <RemindMe save={save} />
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

      {/* Right under the field, like the paste sheet, so the keyboard never covers it. */}
      <View style={styles.button}>
        <Button
          label={field === 'collection' || field === 'reminder' ? 'Done' : 'Save'}
          onPress={done}
          busy={updateSave.isPending}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.sheetTop,
    paddingHorizontal: sheet.paddingX,
  },
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
  button: { marginTop: spacing.sectionGap },
});
