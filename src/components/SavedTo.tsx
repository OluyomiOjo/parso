import { Image, StyleSheet, View } from 'react-native';

import { colors, radius, sheet, type } from '@/theme';

import { Text } from './Text';

// "Saved to [Collection]" with the collection on the highlighter; "Saving…" until the AI has filed it.
export function SavedTo({ collection }: { collection: string | null }) {
  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel={collection ? `Saved to ${collection}` : 'Saving'}>
      <Image source={require('../../assets/brand/icon.png')} style={styles.icon} resizeMode="contain" />
      {collection ? (
        <Text variant="sheetTitle" numberOfLines={1} style={styles.text}>
          Saved to <Text style={[type.sheetTitle, styles.mark]}>{` ${collection} `}</Text>
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
