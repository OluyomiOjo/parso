import { ClipboardPasteButton, isPasteButtonAvailable, type PasteEventPayload } from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { normalizeUrl } from '@/lib/links';
import { isLimitError } from '@/lib/plan';
import { openUpgrade } from '@/lib/pro';
import { useCreateLinkSave } from '@/lib/saves';
import { firstUrlIn } from '@/lib/share';
import { addScreen, colors, radius, size, spacing, type } from '@/theme';

const NOT_A_LINK = "That isn't a link. Copy the full web address and paste it again.";
const LINK_FAILED = "Couldn't save the link. Check your connection and tap Save again.";

// "Save a link", from the Add sheet's Link tile (src/app/add-menu.tsx). Filed like a share.
export default function AddScreen() {
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createLink = useCreateLinkSave('add');

  const saveLink = () => {
    const url = normalizeUrl(link);
    if (!url) return setError(NOT_A_LINK);
    setError(null);
    createLink.mutate(url, {
      // Already saved: show its sheet ("Already in …") instead of saving it twice.
      onSuccess: (save) =>
        save.existing
          ? router.replace({ pathname: '/save/[id]', params: { id: save.id, existing: '1' } })
          : router.back(),
      onError: (e) => (isLimitError(e) ? openUpgrade(saveLink) : setError(LINK_FAILED)),
    });
  };

  const pasteLink = (data: PasteEventPayload) => {
    const pasted = data.type === 'text' ? (firstUrlIn(data.text) ?? data.text.trim()) : '';
    if (pasted) {
      setLink(pasted);
      setError(null);
    }
  };

  return (
    <View style={styles.sheet}>
      <Text variant="sheetTitle" accessibilityRole="header">
        Save a link
      </Text>
      <View style={styles.linkRow}>
        <TextInput
          value={link}
          onChangeText={(value) => {
            setLink(value);
            if (error) setError(null);
          }}
          onSubmitEditing={saveLink}
          placeholder="https://"
          placeholderTextColor={colors.secondary}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="done"
          textContentType="URL"
          accessibilityLabel="Link"
          style={[styles.field, styles.linkField, error ? styles.fieldError : null]}
        />
        {/* Apple's own Paste button: one tap, and iOS shows no "Allow paste" alert. */}
        {isPasteButtonAvailable ? (
          <ClipboardPasteButton
            onPress={pasteLink}
            acceptedContentTypes={['url', 'plain-text']}
            displayMode="iconOnly"
            cornerStyle="large"
            backgroundColor={colors.ink}
            foregroundColor={colors.onInk}
            style={styles.paste}
          />
        ) : null}
      </View>

      {error ? (
        <Text variant="secondary" style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      {/* Right under the field, so the keyboard never covers it. */}
      <View style={styles.button}>
        <Button label="Save" onPress={saveLink} busy={createLink.isPending} disabled={link.trim() === ''} />
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
  linkRow: { flexDirection: 'row', gap: addScreen.pasteGap, marginTop: spacing.sectionGap },
  linkField: { flex: 1, marginTop: 0 },
  paste: { width: size.fieldHeight, height: size.fieldHeight },
  fieldError: { borderColor: colors.ink },
  error: { marginTop: spacing.errorTop },
  button: { marginTop: spacing.sectionGap },
});
