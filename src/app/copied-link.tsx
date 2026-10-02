import { ClipboardPasteButton, type PasteEventPayload } from 'expo-clipboard';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { LinkIcon } from '@/icons/LinkIcon';
import { useCreateLinkSave } from '@/lib/saves';
import { firstUrlIn } from '@/lib/share';
import { colors, copiedLinkSheet as s, radius, size, spacing } from '@/theme';

// The mini sheet offered once per newly copied link (src/lib/clipboard.ts). Apple's own Paste button reads the
// link, so iOS shows no paste alert; the link is then saved and this sheet becomes its save sheet. Swipe it
// down or tap Not now to leave it.
export default function CopiedLinkSheet() {
  const createLink = useCreateLinkSave('clipboard');

  const paste = (data: PasteEventPayload) => {
    const url = data.type === 'text' ? firstUrlIn(data.text) : null;
    if (!url) return router.back();
    createLink.mutate(url, {
      onSuccess: (save) =>
        router.replace({
          pathname: '/save/[id]',
          params: save.existing ? { id: save.id, existing: '1' } : { id: save.id },
        }),
    });
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.sheet}>
      <View style={styles.header}>
        <View style={styles.tile}>
          <LinkIcon color={colors.ink} size={s.icon} strokeWidth={size.iconStroke} />
        </View>
        <Text variant="sectionHeading" accessibilityRole="header" style={styles.title}>
          Save the link you copied
        </Text>
      </View>
      <ClipboardPasteButton
        onPress={paste}
        acceptedContentTypes={['url']}
        displayMode="iconAndLabel"
        cornerStyle="large"
        backgroundColor={colors.ink}
        foregroundColor={colors.onInk}
        style={styles.paste}
      />
      <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={spacing.sm} style={styles.notNow}>
        <Text variant="button" color={colors.secondary}>
          Not now
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.surface, paddingHorizontal: s.paddingX, paddingTop: s.paddingTop },
  header: { flexDirection: 'row', alignItems: 'center', gap: s.iconGap },
  tile: {
    width: s.iconTile,
    height: s.iconTile,
    borderRadius: radius.thumb,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flexShrink: 1 },
  paste: { width: '100%', height: size.buttonHeight, marginTop: s.titleToButton },
  notNow: {
    alignSelf: 'center',
    minHeight: size.minTouch,
    justifyContent: 'center',
    marginTop: s.buttonToNotNow,
  },
});
