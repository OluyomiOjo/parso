import * as Linking from 'expo-linking';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { BookmarkIcon } from '@/icons/BookmarkIcon';
import { ShareIcon } from '@/icons/ShareIcon';
import { colors, firstRun, radius, size } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

// Opens Instagram's app if it's installed, otherwise its website.
const openInstagram = () =>
  Linking.openURL('instagram://app').catch(() => Linking.openURL('https://www.instagram.com'));

function Step({ icon, children }: { icon: ReactNode; children: string }) {
  return (
    <View style={styles.step}>
      {icon}
      <Text variant="firstRunStep" style={styles.stepText}>
        {children}
      </Text>
    </View>
  );
}

// My Parsos before anything is saved (design 3b): how to save from another app.
export function FirstSaveCard() {
  return (
    <View style={styles.card}>
      <Text variant="firstRunTitle" accessibilityRole="header">
        Save your first thing
      </Text>
      <Text variant="body" color={colors.secondary} style={styles.body}>
        Open any post, reel or link, tap Share, then tap Parso. Parso may be hidden under More the first time.
      </Text>
      <View style={styles.steps}>
        <Step icon={<ShareIcon color={colors.ink} size={firstRun.stepIcon} strokeWidth={size.iconStroke} />}>
          Tap Share in Instagram, TikTok or Safari
        </Step>
        <Step icon={<BookmarkIcon color={colors.ink} size={firstRun.stepIcon} strokeWidth={size.iconStroke} />}>
          Choose Parso from the list
        </Step>
      </View>
      <View style={styles.button}>
        <Button label="Try it with Instagram" onPress={openInstagram} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.panel, padding: firstRun.padding },
  body: { marginTop: firstRun.titleToBody },
  steps: { marginTop: firstRun.bodyToSteps, gap: firstRun.stepGap },
  step: { flexDirection: 'row', alignItems: 'center', gap: firstRun.stepIconGap },
  stepText: { flex: 1 },
  button: { marginTop: firstRun.stepsToButton },
});
