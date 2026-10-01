import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, sheet, size } from '@/theme';

import { Text } from './Text';

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
};

// 36pt pill: black when selected, white with the control border otherwise.
export function Pill({ label, selected = false, onPress, accessibilityLabel }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.pill, selected ? styles.selected : styles.unselected]}
    >
      <Text variant="pill" color={selected ? colors.onInk : colors.ink}>
        {label}
      </Text>
    </Pressable>
  );
}

export const pillStyles = StyleSheet.create({
  shape: {
    height: size.pillHeight,
    borderRadius: radius.pill,
    paddingHorizontal: sheet.pillPaddingX,
    justifyContent: 'center',
  },
});

const styles = StyleSheet.create({
  pill: pillStyles.shape,
  selected: { backgroundColor: colors.ink },
  unselected: { backgroundColor: colors.surface, borderWidth: size.hairline, borderColor: colors.controlBorder },
});
