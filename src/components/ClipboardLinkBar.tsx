import { ClipboardPasteButton, type PasteEventPayload } from 'expo-clipboard';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { CloseIcon } from '@/icons/CloseIcon';
import { firstUrlIn } from '@/lib/share';
import { useCreateLinkSave } from '@/lib/saves';
import { clipboardBar, colors, radius, size } from '@/theme';

import { Text } from './Text';

type Props = { onDone: () => void };

// "Save the link you copied" with Apple's own Paste button (no paste alert). Pasting saves the link and opens
// its save sheet, like sharing it into Parso.
export function ClipboardLinkBar({ onDone }: Props) {
  const createLink = useCreateLinkSave();

  const paste = (data: PasteEventPayload) => {
    const url = data.type === 'text' ? firstUrlIn(data.text) : null;
    onDone();
    if (!url) return;
    createLink.mutate(url, { onSuccess: (save) => router.push(`/save/${save.id}`) });
  };

  return (
    <View style={styles.bar}>
      <Text variant="rowTitle" style={styles.text} numberOfLines={1}>
        Save the link you copied
      </Text>
      <ClipboardPasteButton
        onPress={paste}
        acceptedContentTypes={['url']}
        displayMode="labelOnly"
        cornerStyle="capsule"
        backgroundColor={colors.ink}
        foregroundColor={colors.onInk}
        style={styles.paste}
      />
      <Pressable
        onPress={onDone}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        hitSlop={clipboardBar.closeHitSlop}
      >
        <CloseIcon color={colors.secondary} size={clipboardBar.closeIcon} strokeWidth={size.iconStroke} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: clipboardBar.gap,
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
    paddingVertical: clipboardBar.paddingY,
    paddingLeft: clipboardBar.paddingX,
    paddingRight: clipboardBar.paddingY + clipboardBar.gap,
  },
  text: { flex: 1 },
  paste: { width: clipboardBar.pasteWidth, height: clipboardBar.pasteHeight },
});
