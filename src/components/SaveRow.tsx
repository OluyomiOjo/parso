import { StyleSheet, View } from 'react-native';

import { LinkIcon } from '@/icons/LinkIcon';
import { relativeTime, sourceLabel } from '@/lib/format';
import { displayUrl } from '@/lib/links';
import type { SaveListItem } from '@/lib/saves';
import { colors, radius, size, spacing, tabularNums } from '@/theme';

import { Text } from './Text';

export function SaveRow({ save }: { save: SaveListItem }) {
  // Until processing (step 4) writes a title, the URL is the title.
  const title = save.title ?? (save.url ? displayUrl(save.url) : 'Untitled');
  const meta = `${sourceLabel(save.source, save.url)}, ${relativeTime(save.created_at)}`;

  return (
    <View style={styles.row} accessible accessibilityLabel={`${title}. ${meta}`}>
      <View style={styles.thumb}>
        <LinkIcon color={colors.secondary} size={size.thumbIcon} strokeWidth={size.iconStroke} />
      </View>
      <View style={styles.text}>
        <Text variant="rowTitle" numberOfLines={1}>
          {title}
        </Text>
        {save.snippet ? (
          <Text variant="secondary" color={colors.secondary} numberOfLines={1}>
            {save.snippet}
          </Text>
        ) : null}
        <Text variant="rowMeta" color={colors.secondary} numberOfLines={1} style={tabularNums}>
          {meta}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.rowGap,
    paddingHorizontal: spacing.rowPaddingX,
    paddingVertical: spacing.rowPaddingY,
  },
  thumb: {
    width: size.thumb,
    height: size.thumb,
    borderRadius: radius.thumb,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
});
