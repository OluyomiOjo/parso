import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { colors, size } from '@/theme';

type IconButtonProps = {
  label: string; // read by VoiceOver
  onPress: () => void;
  children: ReactNode;
};

export function IconButton({ label, onPress, children }: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={(size.minTouch - size.iconButton) / 2}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: size.iconButton,
    height: size.iconButton,
    borderRadius: size.iconButton / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
