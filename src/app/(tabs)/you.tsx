import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { Text } from '@/components/Text';
import { deleteAccount, signOut, useSession } from '@/lib/auth';
import { MONTHS } from '@/lib/format';
import { planLine } from '@/lib/plan';
import { openUpgrade, usePlan } from '@/lib/pro';
import { ensureNotificationPermission } from '@/lib/reminders';
import { screenshotCheckEnabled, setScreenshotCheck } from '@/lib/screenshots';
import { sendWeeklyUpdateNow, setWeeklyUpdate, weeklyUpdateEnabled } from '@/lib/weekNotification';
import { colors, radius, size, spacing, tabularNums } from '@/theme';

const MANAGE_URL = 'https://apps.apple.com/account/subscriptions'; // Apple's own subscriptions page
// Private (preview) builds only, set in eas.json: the weekly update's test button.
const TEST_TOOLS = process.env.EXPO_PUBLIC_TEST_TOOLS === '1';
const NOTIFICATIONS_OFF = 'Notifications are off for Parso. Turn them on in Settings, Parso, Notifications.';

export default function YouScreen() {
  const { session } = useSession();
  const email = session?.user.email;
  const [deleting, setDeleting] = useState(false);
  const [checkScreenshots, setCheckScreenshots] = useState(false);
  const [weekly, setWeekly] = useState(true);
  const { data: plan } = usePlan();

  useEffect(() => {
    screenshotCheckEnabled().then(setCheckScreenshots);
    weeklyUpdateEnabled().then(setWeekly);
  }, []);

  const toggleWeekly = async (on: boolean) => {
    setWeekly(on);
    if (on && (await ensureNotificationPermission()) === 'denied') Alert.alert(NOTIFICATIONS_OFF);
    await setWeeklyUpdate(on);
  };

  const testWeekly = () =>
    sendWeeklyUpdateNow()
      .then(() => Alert.alert('Sent. Lock your phone; it arrives in about 5 seconds.'))
      .catch((e: Error) => Alert.alert(e.message));

  const toggleScreenshots = async (on: boolean) => {
    setCheckScreenshots(on);
    await setScreenshotCheck(on);
    if (on) await MediaLibrary.requestPermissionsAsync(false, ['photo']).catch(() => undefined);
  };

  const confirmDelete = () =>
    Alert.alert('Delete your account?', "This removes all your saves, collections and pictures and can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete account',
        style: 'destructive',
        onPress: () => {
          setDeleting(true);
          deleteAccount().catch((e: Error) => {
            setDeleting(false);
            Alert.alert(e.message);
          });
        },
      },
    ]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenTitle>You</ScreenTitle>
        {email ? (
          <Text variant="secondary" color={colors.secondary} style={styles.email}>
            Signed in as {email}
          </Text>
        ) : null}
        {plan ? (
          <View style={styles.setting}>
            <View style={styles.settingText}>
              <Text variant="rowTitle">Parso Pro</Text>
              <Text variant="secondary" color={colors.secondary} style={tabularNums}>
                {planLine(plan, MONTHS)}
              </Text>
            </View>
            {!plan.pro ? (
              <Pressable onPress={() => openUpgrade()} accessibilityRole="button" hitSlop={spacing.sm}>
                <Text variant="button">Upgrade</Text>
              </Pressable>
            ) : !plan.adminPro ? (
              <Pressable onPress={() => Linking.openURL(MANAGE_URL)} accessibilityRole="button" hitSlop={spacing.sm}>
                <Text variant="button">Manage</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <Pressable
          onPress={() => router.push('/week')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.setting, pressed && styles.pressed]}
        >
          <View style={styles.settingText}>
            <Text variant="rowTitle">Your week in Parso</Text>
            <Text variant="secondary" color={colors.secondary}>
              What you saved this week, and what's waiting on you.
            </Text>
          </View>
        </Pressable>
        <View style={styles.setting}>
          <View style={styles.settingText}>
            <Text variant="rowTitle">Weekly update</Text>
            <Text variant="secondary" color={colors.secondary}>
              A notification every Sunday at 6 PM.
            </Text>
          </View>
          <Switch
            value={weekly}
            onValueChange={toggleWeekly}
            trackColor={{ true: colors.ink, false: colors.controlBorder }}
            accessibilityLabel="Weekly update"
          />
        </View>
        {TEST_TOOLS ? <Button label="Send the weekly update now" variant="secondary" onPress={testWeekly} /> : null}
        <View style={styles.setting}>
          <View style={styles.settingText}>
            <Text variant="rowTitle">Check for new screenshots</Text>
            <Text variant="secondary" color={colors.secondary}>
              When you open Parso, offer screenshots taken since last time.
            </Text>
          </View>
          <Switch
            value={checkScreenshots}
            onValueChange={toggleScreenshots}
            trackColor={{ true: colors.ink, false: colors.controlBorder }}
            accessibilityLabel="Check for new screenshots"
          />
        </View>
        <Button label="Sign out" variant="secondary" onPress={signOut} />
        <Pressable
          onPress={confirmDelete}
          disabled={deleting}
          accessibilityRole="button"
          hitSlop={spacing.sm}
          style={styles.delete}
        >
          <Text variant="secondary" color={colors.secondary}>
            {deleting ? 'Deleting your account…' : 'Delete account'}
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sectionGap, paddingBottom: spacing.sectionGapLarge + size.addButtonClearance },
  email: { paddingHorizontal: spacing.titleInset },
  setting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
    paddingHorizontal: spacing.rowPaddingX,
    paddingVertical: spacing.rowPaddingY,
  },
  settingText: { flex: 1 },
  pressed: { opacity: 0.8 },
  delete: { alignSelf: 'flex-start', paddingVertical: spacing.md, paddingHorizontal: spacing.titleInset },
});
