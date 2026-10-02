import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Text } from '@/components/Text';
import { useSession } from '@/lib/auth';
import { normalizeUrl } from '@/lib/links';
import { useCreateLinkSave } from '@/lib/saves';
import { saveImage, saveText } from '@/lib/share';
import { track } from '@/lib/track';
import { addScreen, colors, radius, size, spacing, type } from '@/theme';

type Mode = 'link' | 'text' | 'photo';
const MODES: { value: Mode; label: string }[] = [
  { value: 'link', label: 'Link' },
  { value: 'text', label: 'Text' },
  { value: 'photo', label: 'Photo' },
];

const NOT_A_LINK = "That isn't a link. Copy the full web address and paste it again.";
const LINK_FAILED = "Couldn't save the link. Check your connection and tap Save again.";
const TEXT_FAILED = "Couldn't save the text. Check your connection and tap Save again.";
const PHOTO_FAILED = "Couldn't save the photo. Check your connection and choose it again.";

// "Add to Parso": a link, some text, or a photo from the library. Everything is filed like a share.
export default function AddScreen() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const [mode, setMode] = useState<Mode>('link');
  const [link, setLink] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createLink = useCreateLinkSave('add');

  const done = () => {
    queryClient.invalidateQueries({ queryKey: ['saves', session?.user.id] });
    router.back();
  };

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
      onError: () => setError(LINK_FAILED),
    });
  };

  const saveTyped = async () => {
    setBusy(true);
    setError(null);
    const result = await saveText(text.trim());
    setBusy(false);
    if ('error' in result) setError(TEXT_FAILED);
    else {
      track('save_created', { kind: result.kind, source: result.source, via: 'add' });
      done();
    }
  };

  // Apple's photo picker: the person picks one photo, so no photo-library permission is needed.
  const choosePhoto = async () => {
    setError(null);
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset || !session) return;
    setBusy(true);
    const result = await saveImage(
      { uri: asset.uri, width: asset.width, height: asset.height, mimeType: asset.mimeType },
      session.user.id,
    );
    setBusy(false);
    if ('error' in result) setError(PHOTO_FAILED);
    else {
      track('save_created', { kind: result.kind, source: result.source, via: 'add' });
      done();
    }
  };

  return (
    <View style={styles.sheet}>
      <Text variant="sheetTitle" accessibilityRole="header">
        Add to Parso
      </Text>
      <View style={styles.modes}>
        <SegmentedControl
          segments={MODES}
          selected={mode}
          track
          onSelect={(m) => {
            setMode(m);
            setError(null);
          }}
        />
      </View>

      {mode === 'link' ? (
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
          style={[styles.field, error ? styles.fieldError : null]}
        />
      ) : mode === 'text' ? (
        <TextInput
          value={text}
          onChangeText={(value) => {
            setText(value);
            if (error) setError(null);
          }}
          placeholder="A note, a quote, an address, anything"
          placeholderTextColor={colors.secondary}
          autoFocus
          multiline
          textAlignVertical="top"
          accessibilityLabel="Text"
          style={[styles.field, styles.textField]}
        />
      ) : (
        <Text variant="secondary" color={colors.secondary} style={styles.hint}>
          Pick a photo or screenshot. Parso reads it, including any text in it, and files it for you.
        </Text>
      )}

      {error ? (
        <Text variant="secondary" style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      {/* Right under the field, so the keyboard never covers it. */}
      <View style={styles.button}>
        {mode === 'link' ? (
          <Button label="Save" onPress={saveLink} busy={createLink.isPending} disabled={link.trim() === ''} />
        ) : mode === 'text' ? (
          <Button label="Save" onPress={saveTyped} busy={busy} disabled={text.trim() === ''} />
        ) : (
          <Button label="Choose a photo or screenshot" onPress={choosePhoto} busy={busy} />
        )}
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
  modes: { marginTop: spacing.sectionGap },
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
  textField: { height: addScreen.textHeight, paddingTop: spacing.md },
  fieldError: { borderColor: colors.ink },
  hint: { marginTop: spacing.sectionGap, paddingHorizontal: spacing.titleInset },
  error: { marginTop: spacing.errorTop },
  button: { marginTop: spacing.sectionGap },
});
