import { Image, StyleSheet, View } from 'react-native';

import { colors, radius, sheet, type } from '@/theme';

import { Text } from './Text';

// "Saved to [Collection]" with the collection on the highlighter; "Saving…" until the AI has filed it.
// "Already in [Collection]" when the link was saved before and nothing new was saved.
export function SavedTo({ collection, existing = false }: { collection: string | null; existing?: boolean }) {
  const lead = existing ? 'Already in' : 'Saved to';
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="header"
      accessibilityLabel={collection ? `${lead} ${collection}` : 'Saving'}
    >
      <Image source={require('../../assets/brand/icon.png')} style={styles.icon} resizeMode="contain" />
      {collection ? (
        <Text variant="sheetTitle" numberOfLines={2} style={styles.text}>
          {lead} <Text style={[type.sheetTitle, styles.mark]}>{` ${collection} `}</Text>
        </Text>
      ) : (
        <Text variant="sheetTitle" color={colors.secondary} style={styles.text}>
          Saving…
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: sheet.savedToGap },
  icon: { width: sheet.savedToIcon, height: sheet.savedToIcon },
  text: { flexShrink: 1 },
  mark: { backgroundColor: colors.highlighter, color: colors.ink, borderRadius: radius.highlight },
});
