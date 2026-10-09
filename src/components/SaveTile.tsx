import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { metaLabel } from '@/lib/format';
import { displayUrl } from '@/lib/links';
import { openSave } from '@/lib/notes';
import type { SaveListItem } from '@/lib/saves';
import { colors, grid, radius } from '@/theme';

import { PressableScale } from './PressableScale';
import { SourceLine } from './SourceLine';
import { Text } from './Text';

type Props = {
  save: SaveListItem;
  width: number;
  imageHeight: number | null; // null: no picture, so the title goes on a white tile
  thumbnailUrl?: string;
};

// One save in the grid: the picture at its own shape with the title and source under it, or, with no
// picture, a faint grey tile holding the title and its first line. On iOS 18 and later a picture grows into the
// save's page when tapped, and shrinks back on the way out (owner decision, step 11).
export function SaveTile({ save, width, imageHeight, thumbnailUrl }: Props) {
  const title = save.title ?? (save.url ? displayUrl(save.url) : 'Saving…');
  const source = metaLabel(save);
  const zooms = imageHeight !== null && save.kind !== 'text' && !save.id.startsWith('pending-');

  const tile = (
    <PressableScale
      onPress={zooms ? undefined : () => openSave(save)}
      disabled={save.id.startsWith('pending-')}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${source}`}
      style={{ width }}
    >
      {imageHeight !== null ? (
        <>
          <ZoomSource enabled={zooms}>
            {/* One flattened style: the zoom wrapper (a Slot) drops style lists, which lost the picture's height and
                corners and drew each photo at full size (owner report, build 13). */}
            <View style={StyleSheet.flatten([styles.picture, { height: imageHeight }])}>
              {thumbnailUrl ? (
                <Image source={{ uri: thumbnailUrl }} style={styles.fill} accessibilityIgnoresInvertColors />
              ) : null}
            </View>
          </ZoomSource>
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
    </PressableScale>
  );

  return zooms ? (
    <Link href={{ pathname: '/item/[id]', params: { id: save.id } }} asChild>
      {tile}
    </Link>
  ) : (
    tile
  );
}

const ZoomSource = ({ enabled, children }: { enabled: boolean; children: ReactNode }) =>
  enabled ? <Link.AppleZoom>{children}</Link.AppleZoom> : children;

const styles = StyleSheet.create({
  picture: { borderRadius: radius.thumb, overflow: 'hidden', backgroundColor: colors.divider },
  fill: { width: '100%', height: '100%' },
  caption: { marginTop: grid.captionTop },
  textTile: {
    backgroundColor: colors.panel,
    borderRadius: radius.thumb,
    padding: grid.textTilePadding,
    gap: grid.textTileGap,
  },
  source: { marginTop: grid.sourceTop },
});
