import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/IconButton';
import { ListPanel } from '@/components/ListPanel';
import { SaveRow } from '@/components/SaveRow';
import { Text } from '@/components/Text';
import { ChevronLeftIcon } from '@/icons/ChevronLeftIcon';
import { type ReminderSave, useDueReminders, useUpcomingReminders } from '@/lib/reminders';
import { useMarkRemindersSeen } from '@/lib/remindersSeen';
import { formatReminder } from '@/lib/reminderTime';
import { useThumbnailUrls } from '@/lib/saves';
import { collectionScreen, colors, size, spacing } from '@/theme';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

// Opened from the bell on Parsos. Due: reminders that went off in the last 30 days on saves not marked done,
// newest first. Coming up: every reminder still to come, soonest first, each under its time.
export default function RemindersScreen() {
  const insets = useSafeAreaInsets();
  const markSeen = useMarkRemindersSeen();
  useFocusEffect(markSeen); // the bell's number clears once this page has been seen
  const due = useDueReminders();
  const upcoming = useUpcomingReminders();
  const now = new Date();
  // Checked again on screen, so a reminder whose time passed since the last fetch shows under Due, not Coming up.
  const coming = (upcoming.data ?? []).filter((r) => new Date(r.reminder_at) > now);
  const dueList = [...(upcoming.data ?? []).filter((r) => new Date(r.reminder_at) <= now), ...(due.data ?? [])].filter(
    (r, i, all) => all.findIndex((x) => x.id === r.id) === i,
  );
  const { data: thumbnails } = useThumbnailUrls(
    [...dueList, ...coming].flatMap((r) => (r.thumbnail_path ? [r.thumbnail_path] : [])),
  );
  const row = (r: ReminderSave) => (
    <SaveRow key={r.id} save={r} thumbnailUrl={r.thumbnail_path ? thumbnails?.[r.thumbnail_path] : undefined} />
  );

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
      {due.isPending || upcoming.isPending ? (
        <ActivityIndicator style={styles.list} color={colors.secondary} />
      ) : dueList.length || coming.length ? (
        <>
          {dueList.length ? (
            <View style={styles.group}>
              <Text variant="sectionHeading" accessibilityRole="header" style={styles.when}>
                Due
              </Text>
              <ListPanel>{dueList.map(row)}</ListPanel>
            </View>
          ) : null}
          {coming.length ? (
            <View style={styles.group}>
              <Text variant="sectionHeading" accessibilityRole="header" style={styles.when}>
                Coming up
              </Text>
              {coming.map((r) => (
                <View key={r.id} style={styles.item}>
                  <Text variant="meta" style={styles.time}>
                    {formatReminder(new Date(r.reminder_at))}
                  </Text>
                  <ListPanel>{row(r)}</ListPanel>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <Text variant="secondary" color={colors.secondary} style={styles.list}>
          No reminders yet. Open a save and tap Reminder to set one.
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
  group: { marginTop: spacing.sectionGapLarge },
  when: { paddingHorizontal: spacing.titleInset, marginBottom: spacing.headingToPanel },
  item: { marginBottom: spacing.sectionGap },
  time: { paddingHorizontal: spacing.titleInset, marginBottom: spacing.headingToPanel },
  list: { marginTop: spacing.sectionGapLarge, paddingHorizontal: spacing.titleInset },
});
