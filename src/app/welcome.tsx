import { useState } from 'react';
import { Alert, Image, Linking, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { DemoSearchCard } from '@/components/DemoSearchCard';
import { Text } from '@/components/Text';
import { AppleLogo } from '@/icons/AppleLogo';
import { signInWithApple, signInWithGoogle, type SignInResult } from '@/lib/auth';
import { colors, size, spacing, welcome } from '@/theme';

const TERMS_URL = 'https://parso.ai/terms';
const PRIVACY_URL = 'https://parso.ai/privacy';

export default function WelcomeScreen() {
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);

  const run = async (which: 'apple' | 'google', signIn: () => Promise<SignInResult>) => {
    setBusy(which);
    const error = await signIn();
    setBusy(null);
    if (error) Alert.alert(error);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Image
          source={require('../../assets/brand/parso_logo_new.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Parso"
        />
        <Text variant="welcomeTitle" accessibilityRole="header" style={styles.title}>
          Save it now.{'\n'}Find it by asking.
        </Text>
        <Text variant="welcomeBody" color={colors.secondary} style={styles.body}>
          Share anything from Instagram, TikTok, WhatsApp or Safari to Parso. Search it later in your own words.
        </Text>
        <View style={styles.card}>
          <DemoSearchCard />
        </View>
      </View>

      <View style={styles.actions}>
        {/* Apple sign-in is iPhone only; on Android, Google is the one (black) button. */}
        {Platform.OS === 'ios' ? (
          <Button
            label="Continue with Apple"
            icon={(color) => <AppleLogo color={color} size={size.buttonIcon} />}
            busy={busy === 'apple'}
            disabled={busy !== null}
            onPress={() => run('apple', signInWithApple)}
          />
        ) : null}
        <Button
          label="Continue with Google"
          variant={Platform.OS === 'ios' ? 'secondary' : 'primary'}
          busy={busy === 'google'}
          disabled={busy !== null}
          onPress={() => run('google', signInWithGoogle)}
        />
        <Text variant="legal" color={colors.secondary} style={styles.legal}>
          By continuing you agree to the{' '}
          <Text variant="legal" style={styles.link} onPress={() => Linking.openURL(TERMS_URL)} accessibilityRole="link">
            Terms
          </Text>{' '}
          and{' '}
          <Text
            variant="legal"
            style={styles.link}
            onPress={() => Linking.openURL(PRIVACY_URL)}
            accessibilityRole="link"
          >
            Privacy Policy
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screenWide,
  },
  top: { flex: 1 },
  logo: {
    marginTop: welcome.logoTop,
    height: welcome.logoHeight,
    width: welcome.logoHeight * welcome.logoAspect,
  },
  title: { marginTop: welcome.titleTop },
  body: { marginTop: welcome.bodyTop },
  card: { marginTop: welcome.cardTop },
  actions: {
    gap: spacing.buttonGap,
    paddingBottom: welcome.bottom,
  },
  legal: {
    marginTop: welcome.legalTop - spacing.buttonGap,
    textAlign: 'center',
  },
  link: {
    color: colors.ink,
    textDecorationLine: 'underline',
  },
});
