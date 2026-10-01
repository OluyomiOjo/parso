import { Pressable, StyleSheet } from 'react-native';

import { LinkIcon } from '@/icons/LinkIcon';
import { colors, radius, size, spacing } from '@/theme';

import { Text } from './Text';

export function PasteLinkButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Or paste a link"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <LinkIcon color={colors.ink} size={size.buttonIcon} strokeWidth={size.iconStroke} />
      <Text variant="button">Or paste a link</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: size.buttonHeight,
    borderRadius: radius.button,
    borderWidth: size.hairline,
    borderStyle: 'dashed',
    borderColor: colors.dashedBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.iconLabelGap,
  },
  pressed: { opacity: 0.6 },
});
