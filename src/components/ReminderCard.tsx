import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BellIcon } from '@/icons/BellIcon';
import { relativeTime } from '@/lib/format';
import { displayUrl } from '@/lib/links';
import { openSave } from '@/lib/notes';
import type { ReminderSave } from '@/lib/reminders';
import { formatReminder } from '@/lib/reminderTime';
import { colors, radius, reminderCard, size, type } from '@/theme';

import { Text } from './Text';

// The next reminder on My Parsos (design 3): yellow bell tile, when, what, and Open.
export function ReminderCard({ save, more = 0 }: { save: ReminderSave; more?: number }) {
  const when = formatReminder(new Date(save.reminder_at));
  const title = save.title ?? (save.url ? displayUrl(save.url) : 'Your save');
  const open = () => openSave(save);
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`Reminder ${when}: ${title}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.tile}>
        <BellIcon color={colors.ink} size={reminderCard.icon} strokeWidth={size.iconStroke} />
      </View>
      <View style={styles.text}>
        <Text variant="cardTitle" numberOfLines={1}>
          {when}
        </Text>
        <Text variant="secondary" color={colors.secondary} numberOfLines={1}>
          {`${title}, saved ${relativeTime(save.created_at)}`}
        </Text>
        {more > 0 ? (
          <Pressable
            onPress={() => router.push('/reminders')}
            accessibilityRole="button"
            accessibilityLabel={`See all ${more + 1} reminders`}
            hitSlop={reminderCard.moreHitSlop}
          >
            <Text variant="secondary" style={styles.more}>{`and ${more} more`}</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`Open ${title}`} style={styles.button}>
        <Text style={styles.buttonLabel} color={colors.onInk}>
          Open
        </Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: reminderCard.gap,
    padding: reminderCard.padding,
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
  },
  pressed: { opacity: 0.8 },
  tile: {
    width: reminderCard.tile,
    height: reminderCard.tile,
    borderRadius: reminderCard.tileRadius,
    backgroundColor: colors.highlighter, // one of the three allowed highlighter uses
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  button: {
    height: reminderCard.buttonHeight,
    minWidth: size.minTouch,
    borderRadius: reminderCard.buttonHeight / 2,
    paddingHorizontal: reminderCard.buttonPaddingX,
    backgroundColor: colors.ink,
    justifyContent: 'center',
  },
  buttonLabel: type.button,
  more: { textDecorationLine: 'underline' },
});
