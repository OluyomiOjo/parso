import { Pressable, StyleSheet } from 'react-native';

import { colors, detail, spacing } from '@/theme';

import { ListPanel } from './ListPanel';
import { Text } from './Text';

export type DetailRow = { label: string; value: string | null; placeholder: string; onPress: () => void };

// Label on the left, value on the right; tap a row to change it. One white panel with dividers.
export function DetailsPanel({ rows }: { rows: DetailRow[] }) {
  return (
    <ListPanel>
      {rows.map((row) => (
        <Pressable
          key={row.label}
          onPress={row.onPress}
          accessibilityRole="button"
          accessibilityLabel={`${row.label}: ${row.value ?? row.placeholder}. Double tap to change.`}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Text variant="detailLabel" color={colors.secondary}>
            {row.label}
          </Text>
          <Text
            variant="detailValue"
            color={row.value ? colors.ink : colors.secondary}
            numberOfLines={1}
            style={styles.value}
          >
            {row.value ?? row.placeholder}
          </Text>
        </Pressable>
      ))}
    </ListPanel>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: detail.rowHeight,
    paddingHorizontal: spacing.rowPaddingX,
    flexDirection: 'row',
    alignItems: 'center',
    gap: detail.rowGap,
  },
  pressed: { backgroundColor: colors.background },
  value: { flex: 1, textAlign: 'right' },
});
