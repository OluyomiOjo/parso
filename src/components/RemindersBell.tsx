import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BellIcon } from '@/icons/BellIcon';
import { badgeLabel, dueSince } from '@/lib/reminderBadge';
import { useDueReminders } from '@/lib/reminders';
import { useRemindersSeenAt } from '@/lib/remindersSeen';
import { bell, colors, size, tabularNums } from '@/theme';

import { Text } from './Text';

// Top right of Parsos (owner request after build 16, in place of the reminder card): opens Reminders. The yellow
// badge counts reminders that went off since that page was last opened.
export function RemindersBell() {
  const { data: due } = useDueReminders();
  const { data: seenAt } = useRemindersSeenAt();
  const label = seenAt
    ? badgeLabel(
        dueSince(
          (due ?? []).map((r) => r.reminder_at),
          seenAt,
          new Date(),
        ),
      )
    : null;

  return (
    <Pressable
      onPress={() => router.push('/reminders')}
      accessibilityRole="button"
      accessibilityLabel={label ? `Reminders, ${label} new` : 'Reminders'}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <BellIcon color={colors.ink} size={bell.icon} strokeWidth={size.iconStroke} />
      {label ? (
        <View style={styles.badge}>
          <Text style={styles.count}>{label}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: size.minTouch, height: size.minTouch, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  badge: {
    position: 'absolute',
    top: bell.badgeTop,
    right: bell.badgeRight,
    minWidth: bell.badge,
    height: bell.badge,
    borderRadius: bell.badge / 2,
    paddingHorizontal: bell.badgePaddingX,
    backgroundColor: colors.highlighter, // the reminder count: one of the allowed highlighter uses
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { ...bell.count, ...tabularNums, color: colors.ink },
});
