import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useSetReminder } from '@/lib/reminders';
import { choiceFor, formatReminder, type ReminderChoice } from '@/lib/reminderTime';
import { colors, sheet, spacing } from '@/theme';

import { SegmentedControl, type Segment } from './SegmentedControl';
import { Text } from './Text';

type Choice = ReminderChoice | 'never';
const SEGMENTS: Segment<Choice | null>[] = [
  { value: 'tonight', label: 'Tonight' },
  { value: 'weekend', label: 'Weekend' },
  { value: 'nextWeek', label: 'Next week' },
  { value: 'never', label: 'Never', accessibilityLabel: 'Never, no reminder' },
];

const SAVE_FAILED = "Couldn't set the reminder. Check your connection and try again.";
const NOTIFICATIONS_OFF =
  "Notifications are off for Parso, so this reminder won't pop up. Turn them on in Settings, Parso, Notifications.";

// "tonight at 8:00 PM", "tomorrow at 9:00 AM", "on Sat at 10:00 AM".
function reminderPhrase(when: Date): string {
  const label = formatReminder(when);
  return /^(Tonight|Today|Tomorrow)/.test(label) ? label[0].toLowerCase() + label.slice(1) : `on ${label}`;
}

type Props = {
  save: { id: string; title: string | null; url: string | null; reminder_at: string | null } | undefined;
  track?: boolean;
};

// "Remind me": Tonight, Weekend, Next week or Never, then a line saying when, as in design 2.
export function RemindMe({ save, track }: Props) {
  const setReminder = useSetReminder(save);
  const [problem, setProblem] = useState<'off' | 'failed' | null>(null);
  const when = save?.reminder_at ? new Date(save.reminder_at) : null;
  const selected: Choice | null = when ? choiceFor(when) : 'never';

  const pick = (choice: Choice | null) => {
    if (!choice) return;
    setProblem(null);
    setReminder(choice === 'never' ? null : choice)
      .then((permission) => setProblem(permission === 'denied' && choice !== 'never' ? 'off' : null))
      .catch(() => setProblem('failed'));
  };

  return (
    <View style={styles.block}>
      <Text variant="sheetLabel" accessibilityRole="header">
        Remind me
      </Text>
      <SegmentedControl segments={SEGMENTS} selected={selected} onSelect={pick} track={track} />
      {problem === 'off' ? (
        <View style={styles.problem}>
          <Text variant="secondary" accessibilityLiveRegion="polite">
            {NOTIFICATIONS_OFF}
          </Text>
          <Pressable onPress={() => Linking.openSettings()} accessibilityRole="button" hitSlop={spacing.sm}>
            <Text variant="secondary" style={styles.link}>
              Open Settings
            </Text>
          </Pressable>
        </View>
      ) : problem === 'failed' ? (
        <Text variant="secondary" accessibilityLiveRegion="polite">
          {SAVE_FAILED}
        </Text>
      ) : when ? (
        <Text variant="secondary" color={colors.secondary}>
          {when > new Date() ? `Parso will remind you ${reminderPhrase(when)}.` : 'This reminder is due now.'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: sheet.labelToField },
  problem: { gap: spacing.xs },
  link: { textDecorationLine: 'underline' },
});
