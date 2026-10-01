import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { LinkIcon } from '@/icons/LinkIcon';
import { itemLabel, relativeTime } from '@/lib/format';
import { displayUrl } from '@/lib/links';
import type { SaveListItem } from '@/lib/saves';
import { colors, radius, size, spacing } from '@/theme';

import { SourceLine } from './SourceLine';
import { Text } from './Text';

export function SaveRow({ save, thumbnailUrl }: { save: SaveListItem; thumbnailUrl?: string }) {
  // Until processing (step 4) writes a title, the URL is the title.
  const title = save.title ?? (save.url ? displayUrl(save.url) : 'Saving…');
  const meta = `${itemLabel(save.kind, save.source, save.url)}, ${relativeTime(save.created_at)}`;

  return (
    // Opens the save sheet, where the save can be moved to another collection. Saves still being
    // inserted (optimistic rows) have no server id yet, so they can't be opened.
    <Pressable
      onPress={() => router.push(`/save/${save.id}`)}
      disabled={save.id.startsWith('pending-')}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${meta}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
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
        {save.snippet ? (
          <Text variant="secondary" color={colors.secondary} numberOfLines={1}>
            {save.snippet}
          </Text>
        ) : null}
        <SourceLine kind={save.kind} source={save.source} text={meta} />
      </View>
    </Pressable>
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
  pressed: { backgroundColor: colors.background },
  text: { flex: 1 },
});
