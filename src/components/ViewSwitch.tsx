import { Pressable, StyleSheet, View } from 'react-native';

import { GridIcon } from '@/icons/GridIcon';
import { ListIcon } from '@/icons/ListIcon';
import { useViewMode, type ViewMode } from '@/lib/viewMode';
import { colors, size, viewSwitch } from '@/theme';

const OPTIONS: { mode: ViewMode; label: string; Icon: typeof ListIcon }[] = [
  { mode: 'list', label: 'List view', Icon: ListIcon },
  { mode: 'grid', label: 'Grid view', Icon: GridIcon },
];

// The small list/grid switch beside "Recent": the segmented control's look (grey track, white chip on the
// chosen side), with icons in place of words.
export function ViewSwitch() {
  const { mode, setMode } = useViewMode();
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {OPTIONS.map(({ mode: option, label, Icon }) => {
        const active = option === mode;
        return (
          <Pressable
            key={option}
            onPress={() => setMode(option)}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            hitSlop={viewSwitch.hitSlop}
            style={[styles.segment, active && styles.active]}
          >
            <Icon color={active ? colors.ink : colors.secondary} size={viewSwitch.icon} strokeWidth={size.iconStroke} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.divider,
    borderRadius: viewSwitch.radius,
    padding: viewSwitch.inset,
  },
  segment: {
    width: viewSwitch.segmentWidth,
    height: viewSwitch.height - 2 * viewSwitch.inset,
    borderRadius: viewSwitch.chipRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: { backgroundColor: colors.surface },
});
