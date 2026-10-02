import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { useCollectionSummary, useRenameCollection } from '@/lib/collections';
import { colors, radius, size, spacing, type } from '@/theme';

const NAME_MAX = 40; // same limit as a new collection's name

export default function RenameCollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: collection } = useCollectionSummary(id);
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rename = useRenameCollection(id);

  const value = name ?? collection?.name ?? '';
  const unchanged = value.trim() === collection?.name;

  const save = () => {
    if (unchanged) return router.back();
    setError(null);
    rename.mutate(value, {
      onSuccess: () => router.back(),
      onError: (e) => setError(e.message),
    });
  };

  return (
    <View style={styles.sheet}>
      <Text variant="sheetTitle" accessibilityRole="header">
        Rename collection
      </Text>
      <TextInput
        value={value}
        onChangeText={(text) => {
          setName(text);
          if (error) setError(null);
        }}
        onSubmitEditing={save}
        placeholder="Collection name"
        placeholderTextColor={colors.secondary}
        autoFocus
        selectTextOnFocus
        maxLength={NAME_MAX}
        returnKeyType="done"
        accessibilityLabel="Collection name"
        style={[styles.field, error ? styles.fieldError : null]}
      />
      {error ? (
        <Text variant="secondary" style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <View style={styles.button}>
        <Button label="Save" onPress={save} busy={rename.isPending} disabled={value.trim() === ''} />
      </View>
    </View>
  );
}

// Same layout as the Add sheet (src/app/add.tsx).
const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sheetTop,
  },
  field: {
    fontFamily: type.body.fontFamily,
    fontSize: type.body.fontSize,
    marginTop: spacing.sectionGap,
    height: size.fieldHeight,
    borderRadius: radius.button,
    borderWidth: size.hairline,
    borderColor: colors.controlBorder,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.fieldPaddingX,
    color: colors.ink,
  },
  fieldError: { borderColor: colors.ink },
  error: { marginTop: spacing.errorTop },
  button: { marginTop: spacing.sectionGap },
});
