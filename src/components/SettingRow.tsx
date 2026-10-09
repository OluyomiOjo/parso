import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChevronRightIcon } from '@/icons/ChevronRightIcon';
import { colors, settings, size, spacing, tabularNums } from '@/theme';

import { Text } from './Text';

type Props = {
  label: string;
  line?: string; // the explanation or state under the label
  onPress?: () => void; // the whole row opens something; an arrow shows at the end
  accessory?: ReactNode; // a switch or a short action at the end instead
};

// One row in the You tab's settings panel: label and line on the left, an arrow, switch or action on the right.
export function SettingRow({ label, line, onPress, accessory }: Props) {
  const content = (
    <>
      <View style={styles.text}>
        <Text variant="rowTitle">{label}</Text>
        {line ? (
          <Text variant="secondary" color={colors.secondary} style={tabularNums}>
            {line}
          </Text>
        ) : null}
      </View>
      {accessory ??
        (onPress ? (
          <ChevronRightIcon color={colors.secondary} size={settings.chevron} strokeWidth={size.iconStroke} />
        ) : null)}
    </>
  );
  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.row}>{content}</View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: settings.rowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.rowPaddingX,
    paddingVertical: spacing.rowPaddingY,
  },
  pressed: { backgroundColor: colors.divider },
  text: { flex: 1 },
});
