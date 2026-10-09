import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState, type ComponentType } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/PressableScale';
import { Text } from '@/components/Text';
import { CloseIcon } from '@/icons/CloseIcon';
import { LinkIcon } from '@/icons/LinkIcon';
import { NoteIcon } from '@/icons/NoteIcon';
import { PhotoIcon } from '@/icons/PhotoIcon';
import type { IconProps } from '@/icons/types';
import { useSession } from '@/lib/auth';
import { canSave, openUpgrade } from '@/lib/pro';
import { saveImage } from '@/lib/share';
import { track } from '@/lib/track';
import { addMenu, colors, size, spacing } from '@/theme';

const PHOTO_FAILED = "Couldn't save the photo. Check your connection and choose it again.";
const newNote = { pathname: '/note/[id]', params: { id: 'new' } } as const;

// The +'s sheet (owner request after build 14, after Pinterest's): Link, Note or Photo as three large tiles. Link
// opens the link page, Note a new note, Photo Apple's picker; a photo is saved from here.
export default function AddMenu() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openNote = () =>
    void canSave().then((ok) => (ok ? router.replace(newNote) : openUpgrade(() => router.push(newNote))));

  // Apple's photo picker: the person picks one photo, so no photo-library permission is needed.
  const choosePhoto = async () => {
    setError(null);
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset || !session) return;
    const userId = session.user.id;
    const save = async () => {
      setSaving(true);
      const result = await saveImage(
        { uri: asset.uri, width: asset.width, height: asset.height, mimeType: asset.mimeType },
        userId,
      );
      setSaving(false);
      if ('saveId' in result) {
        track('save_created', { kind: result.kind, source: result.source, via: 'add' });
        queryClient.invalidateQueries({ queryKey: ['saves', userId] });
        router.back();
      } else if (!('limit' in result)) setError(PHOTO_FAILED);
      return result;
    };
    const result = await save();
    if ('limit' in result) openUpgrade(() => void save()); // after upgrading, the same photo is saved
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.sheet}>
      {/* Like Pinterest's sheet: a close button on the left and a quiet title in the middle. */}
      <View style={styles.header}>
        <Text variant="cardTitle" accessibilityRole="header">
          Add to Parso
        </Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={spacing.sm}
          style={styles.close}
        >
          <CloseIcon color={colors.ink} size={addMenu.close} strokeWidth={addMenu.closeStroke} />
        </Pressable>
      </View>
      <View style={styles.tiles}>
        <Tile label="Link" Icon={LinkIcon} onPress={() => router.replace('/add')} />
        <Tile label="Note" Icon={NoteIcon} onPress={openNote} />
        <Tile label="Photo" Icon={PhotoIcon} onPress={choosePhoto} busy={saving} />
      </View>
      {error ? (
        <Text variant="secondary" style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </SafeAreaView>
  );
}

type TileProps = { label: string; Icon: ComponentType<IconProps>; onPress: () => void; busy?: boolean };

function Tile({ label, Icon, onPress, busy = false }: TileProps) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy }}
      style={styles.tileItem}
    >
      <View style={styles.tile}>
        {busy ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <Icon color={colors.ink} size={addMenu.icon} strokeWidth={size.iconStroke} />
        )}
      </View>
      <Text variant="body" style={styles.label}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    paddingHorizontal: addMenu.paddingX,
    paddingTop: addMenu.headerTop,
    paddingBottom: addMenu.bottom,
  },
  header: { height: addMenu.headerHeight, alignItems: 'center', justifyContent: 'center' },
  close: {
    position: 'absolute',
    left: 0,
    width: size.minTouch,
    height: size.minTouch,
    justifyContent: 'center',
  },
  tiles: { flexDirection: 'row', justifyContent: 'center', gap: addMenu.tileGap, marginTop: addMenu.titleToTiles },
  tileItem: { alignItems: 'center' },
  tile: {
    width: addMenu.tile,
    height: addMenu.tile,
    borderRadius: addMenu.tileRadius,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { marginTop: addMenu.labelTop },
  error: { marginTop: spacing.sectionGap },
});
