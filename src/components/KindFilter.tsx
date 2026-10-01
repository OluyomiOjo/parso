import { Pressable, StyleSheet, View } from 'react-native';

import { collectionScreen, colors, tabularNums } from '@/theme';

import { Text } from './Text';

export type KindOption = { kind: string | null; label: string; count: number }; // null kind means All

type Props = { options: KindOption[]; selected: string | null; onSelect: (kind: string | null) => void };

// Equal-width segments; the selected one sits on a white chip.
export function KindFilter({ options, selected, onSelect }: Props) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.kind === selected;
        return (
          <Pressable
            key={o.kind ?? 'all'}
            onPress={() => onSelect(o.kind)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${o.label}, ${o.count}`}
            style={[styles.segment, active && styles.active]}
          >
            <Text variant="pill" style={tabularNums} numberOfLines={1}>
              {`${o.label} ${o.count}`}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  segment: {
    flex: 1,
    height: collectionScreen.filterHeight,
    borderRadius: collectionScreen.filterRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: { backgroundColor: colors.surface },
});
