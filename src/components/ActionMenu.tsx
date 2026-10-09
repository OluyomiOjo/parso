import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, size, spacing } from '@/theme';

import { ListPanel } from './ListPanel';
import { Text } from './Text';

export type MenuOption = { label: string; onPress: () => void };

type Props = { visible: boolean; options: MenuOption[]; onClose: () => void };

// A short menu that rises from the bottom, for Android, where iOS's action sheet doesn't exist. One panel of
// choices, then Cancel. Tapping outside closes it.
export function ActionMenu({ visible, options, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const choose = (option: MenuOption) => {
    onClose();
    option.onPress();
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        <ListPanel>
          {options.map((option) => (
            <Pressable
              key={option.label}
              onPress={() => choose(option)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text variant="rowTitle">{option.label}</Text>
            </Pressable>
          ))}
        </ListPanel>
        <View style={styles.cancel}>
          <ListPanel>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text variant="rowTitle">Cancel</Text>
            </Pressable>
          </ListPanel>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.panel,
    borderTopRightRadius: radius.panel,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.screen,
  },
  row: { minHeight: size.buttonHeight, justifyContent: 'center', paddingHorizontal: spacing.rowPaddingX },
  pressed: { backgroundColor: colors.divider },
  cancel: { marginTop: spacing.sm },
});
