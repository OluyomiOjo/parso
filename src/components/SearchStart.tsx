import { Pressable, StyleSheet, View } from 'react-native';

import { SearchIcon } from '@/icons/SearchIcon';
import { colors, search, sheet, size, spacing } from '@/theme';

import { ListPanel } from './ListPanel';
import { Pill } from './Pill';
import { Text } from './Text';

type Props = {
  recent: string[];
  suggestions: string[];
  onPick: (query: string) => void;
  onClearRecent: () => void;
};

// What the Search tab shows before anything is typed: recent searches, then searches built from the
// person's own saves.
export function SearchStart({ recent, suggestions, onPick, onClearRecent }: Props) {
  if (!recent.length && !suggestions.length) {
    return (
      <Text variant="secondary" color={colors.secondary} style={styles.hint}>
        Search in your own words, like “visa bulletin” or “glass house from Instagram”.
      </Text>
    );
  }
  return (
    <View>
      {recent.length ? (
        <View style={styles.section}>
          <View style={styles.headingRow}>
            <Text variant="sectionHeading" accessibilityRole="header">
              Recent
            </Text>
            <Pressable
              onPress={onClearRecent}
              accessibilityRole="button"
              accessibilityLabel="Clear recent searches"
              hitSlop={spacing.sm}
            >
              <Text variant="secondary" color={colors.secondary}>
                Clear
              </Text>
            </Pressable>
          </View>
          <ListPanel>
            {recent.map((q) => (
              <Pressable
                key={q}
                onPress={() => onPick(q)}
                accessibilityRole="button"
                accessibilityLabel={`Search for ${q}`}
                style={({ pressed }) => [styles.recentRow, pressed && styles.pressed]}
              >
                <SearchIcon color={colors.secondary} size={search.clearIcon} strokeWidth={size.iconStroke} />
                <Text variant="body" numberOfLines={1} style={styles.recentText}>
                  {q}
                </Text>
              </Pressable>
            ))}
          </ListPanel>
        </View>
      ) : null}
      {suggestions.length ? (
        <View style={styles.section}>
          <Text variant="sectionHeading" accessibilityRole="header" style={styles.heading}>
            Try
          </Text>
          <View style={styles.pills}>
            {suggestions.map((q) => (
              <Pill key={q} label={q} onPress={() => onPick(q)} accessibilityLabel={`Search for ${q}`} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { marginTop: search.pillsToCount, paddingHorizontal: spacing.titleInset },
  section: { marginTop: spacing.sectionGapLarge },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.titleInset,
    marginBottom: spacing.headingToPanel,
  },
  heading: { paddingHorizontal: spacing.titleInset, marginBottom: spacing.headingToPanel },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: search.iconGap,
    minHeight: size.minTouch,
    paddingHorizontal: spacing.rowPaddingX,
    paddingVertical: spacing.md,
  },
  pressed: { backgroundColor: colors.background },
  recentText: { flex: 1 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: sheet.pillGap },
});
