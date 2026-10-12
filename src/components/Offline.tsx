import { ActivityIndicator, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';

import { useOnline } from '@/lib/connection';
import { offlineLine } from '@/lib/outboxQueue';
import { colors, spacing } from '@/theme';

import { Text } from './Text';

// The slim line at the top of Parsos and Collections while there's no internet: "You're offline. Showing your
// Parsos from 2:14 PM." updatedAt is when the list on screen was last loaded.
export function OfflineLine({ updatedAt }: { updatedAt?: number }) {
  const online = useOnline();
  if (online) return null;
  return (
    <Text variant="secondary" color={colors.secondary} style={styles.line} accessibilityLiveRegion="polite">
      {offlineLine(updatedAt || null)}
    </Text>
  );
}

// While a page loads: the spinner, or, offline with nothing kept on the phone yet, what will happen instead of a
// spinner that never ends.
export function Loading({ style }: { style?: StyleProp<ViewStyle> }) {
  const online = useOnline();
  if (online) return <ActivityIndicator style={style} color={colors.secondary} />;
  return (
    <Text variant="secondary" color={colors.secondary} style={[styles.page, style]}>
      You're offline. This shows here once you're back online.
    </Text>
  );
}

const styles = StyleSheet.create({
  line: { paddingHorizontal: spacing.titleInset, marginTop: spacing.sm },
  page: { paddingHorizontal: spacing.titleInset },
});
