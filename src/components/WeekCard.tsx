import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, reminderCard, size, type } from '@/theme';

import { Text } from './Text';

const openWeek = () => router.push('/week');

// My Parsos, from Sunday 6 PM until the weekly screen is opened (or Wednesday ends).
export function WeekCard() {
  return (
    <Pressable
      onPress={openWeek}
      accessibilityRole="button"
      accessibilityLabel="Your week in Parso is ready. Open"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text variant="cardTitle">Your week in Parso is ready</Text>
        <Text variant="secondary" color={colors.secondary}>
          What you saved, and what's waiting on you.
        </Text>
      </View>
      <View style={styles.button}>
        <Text style={styles.buttonLabel} color={colors.onInk}>
          Open
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: reminderCard.gap,
    padding: reminderCard.padding,
    paddingLeft: reminderCard.padding + reminderCard.gap / 2,
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
  },
  pressed: { opacity: 0.8 },
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
});
