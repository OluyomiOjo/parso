import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { normalizeUrl } from '@/lib/links';
import { useCreateLinkSave } from '@/lib/saves';
import { colors, radius, size, spacing, type } from '@/theme';

const NOT_A_LINK = "That isn't a link. Copy the full web address and paste it again.";
const SAVE_FAILED = "Couldn't save the link. Check your connection and tap Save again.";

export default function PasteScreen() {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createSave = useCreateLinkSave();

  const save = () => {
    const url = normalizeUrl(text);
    if (!url) {
      setError(NOT_A_LINK);
      return;
    }
    setError(null);
    // The row shows in the list behind the sheet straight away; close once the server has it.
    createSave.mutate(url, {
      onSuccess: () => router.back(),
      onError: () => setError(SAVE_FAILED),
    });
  };

  return (
    <View style={styles.sheet}>
      <Text variant="sheetTitle" accessibilityRole="header">
        Paste a link
      </Text>
      <TextInput
        value={text}
        onChangeText={(value) => {
          setText(value);
          if (error) setError(null);
        }}
        onSubmitEditing={save}
        placeholder="https://"
        placeholderTextColor={colors.secondary}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        returnKeyType="done"
        textContentType="URL"
        accessibilityLabel="Link"
        style={[styles.field, error ? styles.fieldError : null]}
      />
      {error ? (
        <Text variant="secondary" style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <View style={styles.button}>
        <Button label="Save" onPress={save} busy={createSave.isPending} disabled={text.trim() === ''} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sheetTop,
  },
  field: {
    fontFamily: type.body.fontFamily,
    fontSize: type.body.fontSize, // no lineHeight: it pushes single-line iOS text off centre
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
