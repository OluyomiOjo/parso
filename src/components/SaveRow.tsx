import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { LinkIcon } from '@/icons/LinkIcon';
import { itemLabel, relativeTime } from '@/lib/format';
import { displayUrl } from '@/lib/links';
import type { SaveListItem } from '@/lib/saves';
import { termsFor, type Match } from '@/lib/search';
import { colors, radius, size, spacing } from '@/theme';

import { HighlightedText } from './HighlightedText';
import { SourceLine } from './SourceLine';

type Props = { save: SaveListItem; thumbnailUrl?: string; matches?: Match[]; onOpen?: () => void };

export function SaveRow({ save, thumbnailUrl, matches = [], onOpen }: Props) {
  // Until processing (step 4) writes a title, the URL is the title.
  const title = save.title ?? (save.url ? displayUrl(save.url) : 'Saving…');
  const meta = `${itemLabel(save.kind, save.source, save.url)}, ${relativeTime(save.created_at)}`;

  return (
    // Opens the save's detail page. Saves still being inserted (optimistic rows) have no server id yet,
    // so they can't be opened.
    <Pressable
      onPress={() => {
        onOpen?.();
        router.push(`/item/${save.id}`);
      }}
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
        <HighlightedText variant="rowTitle" numberOfLines={1} text={title} terms={termsFor(matches, 'title')} />
        {save.snippet ? (
          <HighlightedText
            variant="secondary"
            color={colors.secondary}
            numberOfLines={1}
            text={save.snippet}
            terms={termsFor(matches, 'snippet')}
          />
        ) : null}
        <SourceLine kind={save.kind} source={save.source} text={meta} highlight={termsFor(matches, 'source')} />
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
