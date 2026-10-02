import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/IconButton';
import { ListPanel } from '@/components/ListPanel';
import { SaveRow } from '@/components/SaveRow';
import { Text } from '@/components/Text';
import { ChevronLeftIcon } from '@/icons/ChevronLeftIcon';
import { useUpcomingReminders } from '@/lib/reminders';
import { formatReminder } from '@/lib/reminderTime';
import { useThumbnailUrls } from '@/lib/saves';
import { collectionScreen, colors, size, spacing } from '@/theme';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

// Every upcoming reminder, soonest first, grouped under its time.
export default function RemindersScreen() {
  const insets = useSafeAreaInsets();
  const { data, isPending } = useUpcomingReminders();
  const reminders = (data ?? []).filter((r) => new Date(r.reminder_at) > new Date());
  const { data: thumbnails } = useThumbnailUrls(reminders.flatMap((r) => (r.thumbnail_path ? [r.thumbnail_path] : [])));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.titleTop }]}
    >
      <View style={styles.header}>
        <IconButton label="Back" onPress={goBack}>
          <ChevronLeftIcon color={colors.ink} size={size.iconButtonIcon} strokeWidth={size.iconStroke} />
        </IconButton>
      </View>
      <Text variant="screenTitle" accessibilityRole="header" style={styles.title}>
        Reminders
      </Text>
      {isPending ? (
        <ActivityIndicator style={styles.list} color={colors.secondary} />
      ) : reminders.length ? (
        reminders.map((r) => (
          <View key={r.id} style={styles.group}>
            <Text variant="sectionHeading" style={styles.when}>
              {formatReminder(new Date(r.reminder_at))}
            </Text>
            <ListPanel>
              <SaveRow save={r} thumbnailUrl={r.thumbnail_path ? thumbnails?.[r.thumbnail_path] : undefined} />
            </ListPanel>
          </View>
        ))
      ) : (
        <Text variant="secondary" color={colors.secondary} style={styles.list}>
          No reminders coming up. Open a save and tap Reminder to set one.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.sectionGapLarge },
  header: { flexDirection: 'row' },
  title: { marginTop: collectionScreen.headerToTitle, paddingHorizontal: spacing.titleInset },
  group: { marginTop: spacing.sectionGap },
  when: { paddingHorizontal: spacing.titleInset, marginBottom: spacing.headingToPanel },
  list: { marginTop: spacing.sectionGapLarge, paddingHorizontal: spacing.titleInset },
});
