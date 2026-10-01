import { Image, Pressable, StyleSheet, View } from 'react-native';

import { SourceIcon } from '@/icons/SourceIcon';
import type { CollectionSummary } from '@/lib/collections';
import { saveCount } from '@/lib/format';
import { card, colors, radius, tabularNums } from '@/theme';

import { Text } from './Text';

type Props = {
  collection: CollectionSummary;
  thumbnails?: Record<string, string>;
  onPress: () => void;
  width?: number;
};

// Two picture tiles from the newest saves, then the name and the count.
export function CollectionCard({ collection, thumbnails, onPress, width = card.width }: Props) {
  const tiles = collection.recent.length ? collection.recent : [null];
  const count = saveCount(collection.saveCount);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${collection.name}, ${count}`}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}
    >
      <View style={styles.tiles}>
        {tiles.map((tile, i) => {
          const url = tile?.thumbnail_path ? thumbnails?.[tile.thumbnail_path] : undefined;
          return url ? (
            <Image key={i} source={{ uri: url }} style={styles.tile} accessibilityIgnoresInvertColors />
          ) : (
            <View key={i} style={styles.tile}>
              {tile ? <SourceIcon kind={tile.kind} source={tile.source} size={card.tileIcon} /> : null}
            </View>
          );
        })}
      </View>
      <Text variant="cardTitle" numberOfLines={1} style={styles.name}>
        {collection.name}
      </Text>
      <Text variant="secondary" color={colors.secondary} style={tabularNums}>
        {count}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
    padding: card.padding,
  },
  pressed: { opacity: 0.7 },
  tiles: { flexDirection: 'row', gap: card.tileGap },
  tile: {
    width: card.tile,
    height: card.tile,
    borderRadius: card.tileRadius,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { marginTop: card.tilesToName },
});
