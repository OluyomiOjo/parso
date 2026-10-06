import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Pill } from '@/components/Pill';
import { Text } from '@/components/Text';
import { useSetReminder } from '@/lib/reminders';
import { formatReminder, quickTimes } from '@/lib/reminderTime';
import { useSave } from '@/lib/saves';
import { colors, reminderPicker } from '@/theme';

const SAVE_FAILED = "Couldn't set the reminder. Check your connection and try again.";
const MINUTE = 60 * 1000;

// Pick a date and time for a reminder: three shortcuts, then Apple's own calendar and time wheel. Opened from
// Remind me's "Pick" on the save sheet and the reminder editor (owner request, step 10).
export default function ReminderTimeSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: save } = useSave(id);
  const setReminder = useSetReminder(save);
  const shortcuts = quickTimes();
  const existing = save?.reminder_at ? new Date(save.reminder_at) : null;
  const [when, setWhen] = useState<Date>(() =>
    existing && existing > new Date() ? existing : shortcuts[shortcuts.length - 1].when,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = (chosen: Date) => {
    if (chosen.getTime() < Date.now() + MINUTE) return setError('Pick a time that is still ahead.');
    setBusy(true);
    setError(null);
    setReminder(chosen)
      .then(() => router.back())
      .catch(() => setError(SAVE_FAILED))
      .finally(() => setBusy(false));
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.sheet}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="sheetTitle" accessibilityRole="header">
          Remind me
        </Text>
        <View style={styles.shortcuts}>
          {shortcuts.map((q) => (
            <Pill
              key={q.label}
              label={q.label}
              onPress={() => confirm(q.when)}
              accessibilityLabel={`${q.label}, ${formatReminder(q.when)}`}
            />
          ))}
        </View>
        <DateTimePicker
          value={when}
          mode="datetime"
          display="inline"
          minimumDate={new Date()}
          onChange={(_event, picked) => picked && setWhen(picked)}
          accentColor={colors.ink}
          themeVariant="light"
          style={styles.picker}
        />
        <Text variant="secondary" color={colors.secondary} accessibilityLiveRegion="polite">
          {error ?? formatReminder(when)}
        </Text>
        <View style={styles.button}>
          <Button label="Set reminder" onPress={() => confirm(when)} busy={busy} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.surface },
  content: {
    paddingHorizontal: reminderPicker.paddingX,
    paddingTop: reminderPicker.paddingTop,
    gap: reminderPicker.gap,
  },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: reminderPicker.pillGap },
  picker: { alignSelf: 'stretch' },
  button: { marginTop: reminderPicker.buttonTop },
});
