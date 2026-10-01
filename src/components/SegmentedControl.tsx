import { Pressable, StyleSheet, View } from 'react-native';

import { colors, segmented, tabularNums } from '@/theme';

import { Text } from './Text';

export type Segment<T> = { value: T; label: string; accessibilityLabel?: string };

type Props<T> = {
  segments: Segment<T>[];
  selected: T;
  onSelect: (value: T) => void;
  track?: boolean; // grey track behind the segments, for use on white (the save sheet)
};

// Equal-width segments; the selected one sits on a white chip.
export function SegmentedControl<T>({ segments, selected, onSelect, track = false }: Props<T>) {
  return (
    <View style={[styles.row, track && styles.track]} accessibilityRole="tablist">
      {segments.map((s) => {
        const active = s.value === selected;
        return (
          <Pressable
            key={s.label}
            onPress={() => onSelect(s.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={s.accessibilityLabel ?? s.label}
            style={[styles.segment, active && styles.active]}
          >
            <Text variant="pill" style={tabularNums} numberOfLines={1}>
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  track: { backgroundColor: colors.background, borderRadius: segmented.radius, padding: segmented.inset },
  segment: {
    flex: 1,
    height: segmented.height - 2 * segmented.inset,
    borderRadius: segmented.chipRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: { backgroundColor: colors.surface },
});
