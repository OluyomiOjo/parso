import { Image, StyleSheet, View } from 'react-native';

import { CollectionsIcon } from '@/icons/CollectionsIcon';
import type { CollectionSummary } from '@/lib/collections';
import { circle, colors, size } from '@/theme';

import { Text } from './Text';

type Props = { collection: CollectionSummary; coverUrl?: string; onOpen: () => void };

// A collection on Parsos: its newest picture in a circle with a thin grey ring, the name underneath. A collection
// with no pictures (only notes, say) shows a grey circle with the collections icon. Presses and dragging are
// handled by the row around it (ReorderList).
export function CollectionCircle({ collection, coverUrl, onOpen }: Props) {
  return (
    <View
      style={styles.item}
      accessible
      accessibilityRole="button"
      accessibilityLabel={collection.name}
      accessibilityHint="Opens the collection. Press and hold to move it."
      onAccessibilityTap={onOpen} // VoiceOver's double tap; finger taps come through the row's gestures
    >
      <View style={styles.ring}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.picture} accessibilityIgnoresInvertColors />
        ) : (
          <View style={[styles.picture, styles.empty]}>
            <CollectionsIcon color={colors.secondary} size={circle.icon} strokeWidth={size.iconStroke} />
          </View>
        )}
      </View>
      <Text variant="meta" color={colors.ink} numberOfLines={1} style={styles.name}>
        {collection.name}
      </Text>
    </View>
  );
}

const inner = circle.size - 2 * (circle.ring + circle.ringGap);

const styles = StyleSheet.create({
  item: { width: circle.nameWidth, alignItems: 'center' },
  ring: {
    width: circle.size,
    height: circle.size,
    borderRadius: circle.size / 2,
    borderWidth: circle.ring,
    borderColor: colors.controlBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  picture: { width: inner, height: inner, borderRadius: inner / 2, backgroundColor: colors.panel },
  empty: { alignItems: 'center', justifyContent: 'center' },
  name: { marginTop: circle.nameTop, maxWidth: circle.nameWidth, textAlign: 'center' },
});
