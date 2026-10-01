import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, size, spacing } from '@/theme';

import { Text } from './Text';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  icon?: (color: string) => ReactNode;
  busy?: boolean;
  disabled?: boolean;
};

export function Button({ label, onPress, variant = 'primary', icon, busy = false, disabled = false }: ButtonProps) {
  const primary = variant === 'primary';
  const fg = primary ? colors.onInk : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      style={({ pressed }) => [styles.base, primary ? styles.primary : styles.secondary, pressed && styles.pressed]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.content}>
          {icon?.(fg)}
          <Text variant="button" color={fg}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: size.buttonHeight,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.ink },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: size.hairline,
    borderColor: colors.controlBorder,
  },
  pressed: { opacity: 0.8 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.iconLabelGap },
});
