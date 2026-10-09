import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/Button';
import { ListPanel } from '@/components/ListPanel';
import { Screen } from '@/components/Screen';
import { SettingRow } from '@/components/SettingRow';
import { ScreenTitle } from '@/components/ScreenTitle';
import { Text } from '@/components/Text';
import { deleteAccount, signOut, useSession } from '@/lib/auth';
import { MONTHS } from '@/lib/format';
import { planLine } from '@/lib/plan';
import { openUpgrade, usePlan } from '@/lib/pro';
import { ensureNotificationPermission } from '@/lib/reminders';
import { screenshotCheckEnabled, setScreenshotCheck } from '@/lib/screenshots';
import { sendWeeklyUpdateNow, setWeeklyUpdate, weeklyUpdateEnabled } from '@/lib/weekNotification';
import { colors, radius, settings, size, spacing } from '@/theme';

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

  const name = (session?.user.user_metadata?.full_name ?? session?.user.user_metadata?.name) as string | undefined;
  const initial = (name || email || 'P').trim().charAt(0).toUpperCase();
  const proAction = !plan ? null : !plan.pro ? (
    <Pressable onPress={() => openUpgrade()} accessibilityRole="button" hitSlop={spacing.sm}>
      <Text variant="button">Upgrade</Text>
    </Pressable>
  ) : !plan.adminPro ? (
    <Pressable onPress={() => Linking.openURL(MANAGE_URL)} accessibilityRole="button" hitSlop={spacing.sm}>
      <Text variant="button">Manage</Text>
    </Pressable>
  ) : null;
  const toggle = (value: boolean, onChange: (on: boolean) => void, label: string) => (
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ true: colors.ink, false: colors.controlBorder }}
      accessibilityLabel={label}
    />
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenTitle>You</ScreenTitle>
        {/* Profile card: initial, name (when Apple or Google gave one) and email. */}
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text variant="sectionHeading">{initial}</Text>
          </View>
          <View style={styles.profileText}>
            <Text variant="rowTitle" numberOfLines={1}>
              {name || 'Your Parso account'}
            </Text>
            {email ? (
              <Text variant="secondary" color={colors.secondary} numberOfLines={1}>
                {email}
              </Text>
            ) : null}
          </View>
        </View>

        <ListPanel>
          {plan ? <SettingRow label="Parso Pro" line={planLine(plan, MONTHS)} accessory={proAction} /> : null}
          <SettingRow
            label="Your week in Parso"
            line="What you saved this week, and what's waiting on you."
            onPress={() => router.push('/week')}
          />
          <SettingRow
            label="Weekly update"
            line="A notification every Sunday at 6 PM."
            accessory={toggle(weekly, toggleWeekly, 'Weekly update')}
          />
          <SettingRow
            label="Check for new screenshots"
            line="When you open Parso, offer screenshots taken since last time."
            accessory={toggle(checkScreenshots, toggleScreenshots, 'Check for new screenshots')}
          />
        </ListPanel>

        {TEST_TOOLS ? <Button label="Send the weekly update now" variant="secondary" onPress={testWeekly} /> : null}
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
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: settings.profileGap,
    padding: settings.profilePadding,
    backgroundColor: colors.panel,
    borderRadius: radius.panel,
  },
  avatar: {
    width: settings.avatar,
    height: settings.avatar,
    borderRadius: settings.avatar / 2,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { flex: 1 },
  delete: { alignSelf: 'flex-start', paddingVertical: spacing.md, paddingHorizontal: spacing.titleInset },
});
