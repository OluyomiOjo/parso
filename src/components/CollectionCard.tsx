import { Image, StyleSheet, View } from 'react-native';

import { CollectionsIcon } from '@/icons/CollectionsIcon';
import type { CollectionSummary } from '@/lib/collections';
import { saveCount } from '@/lib/format';
import { card, colors, size, tabularNums } from '@/theme';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Props = {
  collection: CollectionSummary;
  thumbnails?: Record<string, string>;
  onPress: () => void;
  width: number;
};

// A collection on the Collections tab, board style (owner decision, step 11): its three newest pictures, one large
// and two small stacked beside it, then the name and the count. Empty spots are faint grey; a collection with no
// pictures at all shows the collections icon.
export function CollectionCard({ collection, thumbnails, onPress, width }: Props) {
  const count = saveCount(collection.saveCount);
  const height = Math.round(width * card.boardRatio);
  const small = (height - card.boardGap) / 2;
  const urls = [0, 1, 2].map((i) => {
    const path = collection.recent[i]?.thumbnail_path;
    return path ? thumbnails?.[path] : undefined;
  });

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${collection.name}, ${count}`}
      style={{ width }}
    >
      <View style={[styles.board, { height }]}>
        <Picture url={urls[0]} style={styles.large} icon={!collection.recent.length} />
        <View style={[styles.side, { width: small }]}>
          <Picture url={urls[1]} style={styles.small} />
          <Picture url={urls[2]} style={styles.small} />
        </View>
      </View>
      <Text variant="rowTitle" numberOfLines={1} style={styles.name}>
        {collection.name}
      </Text>
      <Text variant="meta" color={colors.secondary} style={tabularNums}>
        {count}
      </Text>
    </PressableScale>
  );
}

function Picture({ url, style, icon = false }: { url?: string; style: object; icon?: boolean }) {
  return url ? (
    <Image source={{ uri: url }} style={[styles.fill, style]} accessibilityIgnoresInvertColors />
  ) : (
    <View style={[styles.fill, styles.empty, style]}>
      {icon ? (
        <CollectionsIcon color={colors.secondary} size={card.placeholderIcon} strokeWidth={size.iconStroke} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { flexDirection: 'row', gap: card.boardGap, borderRadius: card.boardRadius, overflow: 'hidden' },
  large: { flex: 1 },
  side: { gap: card.boardGap },
  small: { flex: 1 },
  fill: { backgroundColor: colors.panel },
  empty: { alignItems: 'center', justifyContent: 'center' },
  name: { marginTop: card.boardToName },
});
