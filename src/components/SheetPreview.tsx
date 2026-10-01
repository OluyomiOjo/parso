import { Image, StyleSheet, View } from 'react-native';

import { LinkIcon } from '@/icons/LinkIcon';
import { itemLabel } from '@/lib/format';
import { displayUrl } from '@/lib/links';
import type { SaveDetail } from '@/lib/saves';
import { colors, radius, sheet, size } from '@/theme';

import { SourceLine } from './SourceLine';
import { Text } from './Text';

export function SheetPreview({ save, thumbnailUrl }: { save: SaveDetail; thumbnailUrl?: string }) {
  const title = save.title ?? (save.url ? displayUrl(save.url) : 'Saving…');
  return (
    <View style={styles.row}>
      {thumbnailUrl ? (
        <Image source={{ uri: thumbnailUrl }} style={styles.thumb} accessibilityIgnoresInvertColors />
      ) : (
        <View style={styles.thumb}>
          <LinkIcon color={colors.secondary} size={size.thumbIcon} strokeWidth={size.iconStroke} />
        </View>
      )}
      <View style={styles.text}>
        <Text variant="rowTitle" numberOfLines={1}>
          {title}
        </Text>
        <SourceLine
          kind={save.kind}
          source={save.source}
          text={itemLabel(save.kind, save.source, save.url)}
          variant="secondary"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: sheet.previewGap },
  thumb: {
    width: sheet.previewThumb,
    height: sheet.previewThumb,
    borderRadius: radius.thumb,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
});
