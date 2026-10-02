import { StyleSheet, View, useWindowDimensions } from 'react-native';

import type { SaveListItem } from '@/lib/saves';
import { grid, spacing } from '@/theme';

import { SaveTile } from './SaveTile';

type Props = { saves: SaveListItem[]; thumbnails?: Record<string, string> };

// The picture's height at the column width: its real shape, kept between a wide and a tall limit so one
// panorama or one long screenshot doesn't take over. A picture without a recorded size shows square.
function pictureHeight(save: SaveListItem, width: number): number | null {
  if (!save.thumbnail_path) return null;
  const ratio =
    save.thumbnail_width && save.thumbnail_height ? save.thumbnail_height / save.thumbnail_width : grid.fallbackRatio;
  return Math.round(width * Math.min(grid.maxRatio, Math.max(grid.minRatio, ratio)));
}

// Two columns, Pinterest style: each save goes into whichever column is shorter so far, so the columns
// end about level. Heights are worked out from the recorded picture sizes, so nothing jumps as pictures load.
export function SaveGrid({ saves, thumbnails }: Props) {
  const window = useWindowDimensions();
  const width = (window.width - 2 * spacing.screen - grid.columnGap) / 2;

  const columns: { save: SaveListItem; imageHeight: number | null }[][] = [[], []];
  const heights = [0, 0];
  for (const save of saves) {
    const imageHeight = pictureHeight(save, width);
    const column = heights[0] <= heights[1] ? 0 : 1;
    columns[column].push({ save, imageHeight });
    heights[column] += (imageHeight ?? grid.textTileEstimate) + grid.captionEstimate + grid.rowGap;
  }

  return (
    <View style={styles.row}>
      {columns.map((items, i) => (
        <View key={i} style={styles.column}>
          {items.map(({ save, imageHeight }) => (
            <SaveTile
              key={save.id}
              save={save}
              width={width}
              imageHeight={imageHeight}
              thumbnailUrl={save.thumbnail_path ? thumbnails?.[save.thumbnail_path] : undefined}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: grid.columnGap, alignItems: 'flex-start' },
  column: { flex: 1, gap: grid.rowGap },
});
