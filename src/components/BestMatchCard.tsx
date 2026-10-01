import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { itemLabel, relativeTime } from '@/lib/format';
import { displayUrl } from '@/lib/links';
import { termsFor, type SearchResult } from '@/lib/search';
import { colors, radius, search, size } from '@/theme';

import { HighlightedText } from './HighlightedText';
import { SourceLine } from './SourceLine';

// The top search result: a full-width picture, then the title and where it came from.
export function BestMatchCard({ result, thumbnailUrl }: { result: SearchResult; thumbnailUrl?: string }) {
  const title = result.title ?? (result.url ? displayUrl(result.url) : 'Saving…');
  const meta = [
    `${itemLabel(result.kind, result.source, result.url)}, saved ${relativeTime(result.created_at)}`,
    result.collection_name ? ` in ${result.collection_name}` : '',
  ].join('');
  return (
    <Pressable
      onPress={() => router.push(`/save/${result.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Best match: ${title}. ${meta}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {thumbnailUrl ? (
        <Image source={{ uri: thumbnailUrl }} style={styles.image} accessibilityIgnoresInvertColors />
      ) : null}
      <View style={styles.text}>
        <HighlightedText variant="cardTitle" numberOfLines={2} text={title} terms={termsFor(result.matches, 'title')} />
        <SourceLine
          kind={result.kind}
          source={result.source}
          text={meta}
          variant="secondary"
          highlight={[...termsFor(result.matches, 'source'), ...termsFor(result.matches, 'collection')]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.panel, overflow: 'hidden' },
  pressed: { opacity: 0.8 },
  image: { width: '100%', height: size.bestMatchHeight, backgroundColor: colors.background },
  text: { padding: search.bestMatchPadding, gap: search.bestMatchTextGap },
});
