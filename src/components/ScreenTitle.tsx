import { StyleSheet } from 'react-native';

import { spacing } from '@/theme';

import { Text } from './Text';

export function ScreenTitle({ children }: { children: string }) {
  return (
    <Text variant="screenTitle" accessibilityRole="header" style={styles.title}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.titleTop,
    paddingHorizontal: spacing.titleInset,
  },
});
