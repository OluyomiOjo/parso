import { useQueryClient } from '@tanstack/react-query';
import { ClipboardPasteButton, isPasteButtonAvailable, type PasteEventPayload } from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { SegmentedControl, type Segment } from '@/components/SegmentedControl';
import { Text } from '@/components/Text';
import { LinkIcon } from '@/icons/LinkIcon';
import { NoteIcon } from '@/icons/NoteIcon';
import { PhotoIcon } from '@/icons/PhotoIcon';
import { useSession } from '@/lib/auth';
import { normalizeUrl } from '@/lib/links';
import { isLimitError } from '@/lib/plan';
import { canSave, openUpgrade } from '@/lib/pro';
import { useCreateLinkSave } from '@/lib/saves';
import { firstUrlIn, saveImage } from '@/lib/share';
import { track } from '@/lib/track';
import { addScreen, colors, radius, segmented, size, spacing, type } from '@/theme';

type Mode = 'link' | 'text' | 'photo';
const iconFor = (Icon: typeof LinkIcon) => (color: string) => (
  <Icon color={color} size={segmented.icon} strokeWidth={size.iconStroke} />
);
const MODES: Segment<Mode>[] = [
  { value: 'link', label: 'Link', icon: iconFor(LinkIcon) },
  { value: 'text', label: 'Note', icon: iconFor(NoteIcon) },
  { value: 'photo', label: 'Photo', icon: iconFor(PhotoIcon) },
];

const NOT_A_LINK = "That isn't a link. Copy the full web address and paste it again.";
const LINK_FAILED = "Couldn't save the link. Check your connection and tap Save again.";
const PHOTO_FAILED = "Couldn't save the photo. Check your connection and choose it again.";

// "Add to Parso": a link, a note, or a photo from the library. Links and photos are filed like a share; Note
// opens the note editor.
export default function AddScreen() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const [mode, setMode] = useState<Mode>('link');
  const [link, setLink] = useState('');
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

  // Apple's photo picker: the person picks one photo, so no photo-library permission is needed.
  const choosePhoto = async () => {
    setError(null);
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset || !session) return;
    const userId = session.user.id;
    const save = async () => {
      setBusy(true);
      const result = await saveImage(
        { uri: asset.uri, width: asset.width, height: asset.height, mimeType: asset.mimeType },
        userId,
      );
      setBusy(false);
      return result;
    };
    const result = await save();
    if ('limit' in result) {
      // After upgrading, the same photo is saved.
      return openUpgrade(
        () =>
          void save().then((r) => {
            if ('saveId' in r) {
              track('save_created', { kind: r.kind, source: r.source, via: 'add' });
              done();
            } else setError(PHOTO_FAILED);
          }),
      );
    }
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
            // A note is written full screen, like Apple Notes.
            if (m === 'text') {
              const openNote = () => router.push({ pathname: '/note/[id]', params: { id: 'new' } });
              void canSave().then((ok) =>
                ok ? router.replace({ pathname: '/note/[id]', params: { id: 'new' } }) : openUpgrade(openNote),
              );
              return;
            }
            setMode(m);
            setError(null);
          }}
        />
      </View>

      {mode === 'link' ? (
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
  linkRow: { flexDirection: 'row', gap: addScreen.pasteGap, marginTop: spacing.sectionGap },
  linkField: { flex: 1, marginTop: 0 },
  paste: { width: size.fieldHeight, height: size.fieldHeight },
  fieldError: { borderColor: colors.ink },
  hint: { marginTop: spacing.sectionGap, paddingHorizontal: spacing.titleInset },
  error: { marginTop: spacing.errorTop },
  button: { marginTop: spacing.sectionGap },
});
