import { Image, Pressable, StyleSheet, View } from 'react-native';

import { metaLabel } from '@/lib/format';
import { displayUrl } from '@/lib/links';
import { openSave } from '@/lib/notes';
import type { SaveListItem } from '@/lib/saves';
import { colors, grid, radius } from '@/theme';

import { SourceLine } from './SourceLine';
import { Text } from './Text';

type Props = {
  save: SaveListItem;
  width: number;
  imageHeight: number | null; // null: no picture, so the title goes on a white tile
  thumbnailUrl?: string;
};

// One save in the grid: the picture at its own shape with the title and source under it, or, with no
// picture, a white tile holding the title and its first line.
export function SaveTile({ save, width, imageHeight, thumbnailUrl }: Props) {
  const title = save.title ?? (save.url ? displayUrl(save.url) : 'Saving…');
  const source = metaLabel(save);

  return (
    <Pressable
      onPress={() => openSave(save)}
      disabled={save.id.startsWith('pending-')}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${source}`}
      style={({ pressed }) => [{ width }, pressed && styles.pressed]}
    >
      {imageHeight !== null ? (
        <>
          <View style={[styles.picture, { height: imageHeight }]}>
            {thumbnailUrl ? (
              <Image source={{ uri: thumbnailUrl }} style={styles.fill} accessibilityIgnoresInvertColors />
            ) : null}
          </View>
          <Text variant="rowTitle" numberOfLines={2} style={styles.caption}>
            {title}
          </Text>
        </>
      ) : (
        <View style={styles.textTile}>
          <Text variant="rowTitle" numberOfLines={grid.textTitleLines}>
            {title}
          </Text>
          {save.snippet ? (
            <Text variant="secondary" color={colors.secondary} numberOfLines={grid.textSnippetLines}>
              {save.snippet}
            </Text>
          ) : null}
        </View>
      )}
      <View style={styles.source}>
        <SourceLine kind={save.kind} source={save.source} text={source} done={Boolean(save.done_at)} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  picture: { borderRadius: radius.thumb, overflow: 'hidden', backgroundColor: colors.divider },
  fill: { width: '100%', height: '100%' },
  caption: { marginTop: grid.captionTop },
  textTile: {
    backgroundColor: colors.surface,
    borderRadius: radius.thumb,
    padding: grid.textTilePadding,
    gap: grid.textTileGap,
  },
  source: { marginTop: grid.sourceTop },
  pressed: { opacity: 0.7 },
});
