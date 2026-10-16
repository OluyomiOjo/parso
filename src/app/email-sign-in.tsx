import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { isEmailAddress, sendEmailCode, verifyEmailCode } from '@/lib/auth';
import { colors, emailSignIn as e, radius, size, spacing, type } from '@/theme';

const NOT_AN_EMAIL = 'Enter your full email address, like name@example.com.';
const RESEND_AFTER_S = 30;

// Continue with email (owner decision after build 23): type the email, then the 6-digit code from it. No passwords.
// A new address gets an account the same way. Once signed in, the app moves on by itself (src/app/_layout.tsx).
export default function EmailSignInScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0); // seconds until a new code can be sent
  const codeRef = useRef<TextInput>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const send = async () => {
    if (!isEmailAddress(email)) return setError(NOT_AN_EMAIL);
    setBusy(true);
    setError(null);
    const failed = await sendEmailCode(email);
    setBusy(false);
    if (failed) return setError(failed);
    setStep('code');
    setCode('');
    setWait(RESEND_AFTER_S);
    setTimeout(() => codeRef.current?.focus(), 50);
  };

  const signIn = async () => {
    setBusy(true);
    setError(null);
    const failed = await verifyEmailCode(email, code);
    setBusy(false);
    if (failed) setError(failed);
  };

  const changeEmail = () => {
    setStep('email');
    setCode('');
    setError(null);
  };

  return (
    <View style={styles.sheet}>
      <Text variant="sheetTitle" accessibilityRole="header">
        {step === 'email' ? 'Continue with email' : 'Check your email'}
      </Text>
      <Text color={colors.secondary} style={styles.lead}>
        {step === 'email'
          ? "We'll email you a 6-digit code. No password needed."
          : `Type the code we sent to ${email.trim()}.`}
      </Text>

      {step === 'email' ? (
        <TextInput
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (error) setError(null);
          }}
          onSubmitEditing={send}
          placeholder="name@example.com"
          placeholderTextColor={colors.secondary}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="send"
          accessibilityLabel="Email address"
          style={[styles.field, error ? styles.fieldError : null]}
        />
      ) : (
        <TextInput
          ref={codeRef}
          value={code}
          onChangeText={(value) => {
            setCode(value.replace(/\D/g, ''));
            if (error) setError(null);
          }}
          onSubmitEditing={signIn}
          placeholder="123456"
          placeholderTextColor={colors.secondary}
          keyboardType="number-pad"
          textContentType="oneTimeCode" // iOS offers the code from Mail
          autoComplete="one-time-code"
          maxLength={e.codeMax}
          accessibilityLabel="Code from the email"
          style={[styles.field, styles.codeField, error ? styles.fieldError : null]}
        />
      )}

      {error ? (
        <Text variant="secondary" style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <View style={styles.button}>
        {step === 'email' ? (
          <Button label="Send code" onPress={send} busy={busy} disabled={busy || email.trim() === ''} />
        ) : (
          <Button label="Sign in" onPress={signIn} busy={busy} disabled={busy || code.length < e.codeMin} />
        )}
      </View>

      {step === 'code' ? (
        <View style={styles.links}>
          <Pressable onPress={changeEmail} accessibilityRole="button" style={styles.link}>
            <Text variant="secondary" color={colors.ink}>
              Use a different email
            </Text>
          </Pressable>
          <Pressable onPress={send} disabled={wait > 0 || busy} accessibilityRole="button" style={styles.link}>
            <Text variant="secondary" color={wait > 0 ? colors.secondary : colors.ink}>
              {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={[styles.link, styles.back]}>
          <Text variant="secondary" color={colors.ink}>
            Back
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screenWide,
    paddingTop: spacing.sheetTop,
  },
  lead: { marginTop: spacing.sm },
  field: {
    marginTop: spacing.sectionGap,
    height: size.fieldHeight,
    borderRadius: radius.button,
    borderWidth: size.hairline,
    borderColor: colors.controlBorder,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.fieldPaddingX,
    fontFamily: type.body.fontFamily,
    fontSize: type.body.fontSize, // no lineHeight: it pushes single-line iOS text off centre
    color: colors.ink,
  },
  codeField: { letterSpacing: e.codeSpacing, fontVariant: ['tabular-nums'] },
  fieldError: { borderColor: colors.ink },
  error: { marginTop: spacing.errorTop },
  button: { marginTop: spacing.sectionGap },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  link: { minHeight: size.minTouch, justifyContent: 'center' },
  back: { alignSelf: 'center', marginTop: spacing.sm },
});
