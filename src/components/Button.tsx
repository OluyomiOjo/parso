import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, radius, size, spacing } from '@/theme';

import { PressableScale } from './PressableScale';
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
    <PressableScale
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      style={[styles.base, primary ? styles.primary : styles.secondary]}
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
    </PressableScale>
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
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.iconLabelGap },
});
