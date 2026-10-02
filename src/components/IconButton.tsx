import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { colors, size } from '@/theme';

type IconButtonProps = {
  label: string; // read by VoiceOver
  onPress: () => void;
  children: ReactNode;
  variant?: 'surface' | 'ink'; // ink: the larger black + on My Parsos
};

export function IconButton({ label, onPress, children, variant = 'surface' }: IconButtonProps) {
  const ink = variant === 'ink';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={ink ? 0 : (size.minTouch - size.iconButton) / 2}
      style={({ pressed }) => [styles.button, ink && styles.ink, pressed && styles.pressed]}
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
  ink: {
    width: size.addButton,
    height: size.addButton,
    borderRadius: size.addButton / 2,
    backgroundColor: colors.ink,
  },
  pressed: { opacity: 0.7 },
});
