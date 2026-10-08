import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { CheckIcon } from '@/icons/CheckIcon';
import { FREE_SAVES } from '@/lib/plan';
import { cancelledPurchase, purchasesAvailable, takePendingSave, useOffer, usePlan, usePurchase } from '@/lib/pro';
import { colors, radius, size, upgrade } from '@/theme';

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'; // Apple's standard terms
const PRIVACY_URL = 'https://parso.ai/privacy';
const BUY_FAILED = "Couldn't complete the purchase. You weren't charged. Check your connection and try again.";
const RESTORE_NONE = 'No Parso Pro subscription was found for this Apple Account.';
const RESTORE_FAILED = "Couldn't restore purchases. Check your connection and try again.";
const BENEFITS = ['Unlimited saves', 'Save videos up to 3 minutes', 'Everything stays searchable'];

type Choice = 'yearly' | 'monthly';

// Parso Pro: opened when a free account reaches its 50th save, and from the You tab. Prices come from Apple in the
// viewer's own currency. Apple's required wording and links sit under the button.
export default function UpgradeSheet() {
  const { data: plan } = usePlan();
  const { data: offer, isPending, isError } = useOffer();
  const { buy, restore } = usePurchase();
  const [choice, setChoice] = useState<Choice>('yearly');
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);

  const atLimit = plan && !plan.pro && plan.used >= FREE_SAVES;
  const chosen: PurchasesPackage | null = offer?.[choice] ?? null;
  const loading = purchasesAvailable() && isPending;
  const unavailable = !purchasesAvailable() || isError || (!isPending && !offer?.yearly && !offer?.monthly);

  const finish = () => {
    router.back();
    const retry = takePendingSave();
    Alert.alert("You're on Parso Pro", retry ? 'Saving what you shared now.' : undefined);
    retry?.();
  };

  const subscribe = async () => {
    if (!chosen) return;
    setBusy('buy');
    try {
      if (await buy(chosen)) finish();
    } catch (error) {
      if (!cancelledPurchase(error)) Alert.alert(BUY_FAILED);
    } finally {
      setBusy(null);
    }
  };

  const restorePurchases = async () => {
    setBusy('restore');
    try {
      if (await restore()) finish();
      else Alert.alert(RESTORE_NONE);
    } catch {
      Alert.alert(RESTORE_FAILED);
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.sheet}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="sheetTitle" accessibilityRole="header">
          Parso Pro
        </Text>
        <Text color={colors.secondary}>
          {atLimit
            ? `You've used your ${FREE_SAVES} free saves. Everything you saved stays yours.`
            : `Parso is free for your first ${FREE_SAVES} saves. Pro has no limit.`}
        </Text>

        <View style={styles.benefits}>
          {BENEFITS.map((benefit) => (
            <View key={benefit} style={styles.benefit}>
              <CheckIcon color={colors.ink} size={upgrade.checkIcon} strokeWidth={size.iconStroke} />
              <Text>{benefit}</Text>
            </View>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.secondary} style={styles.loading} />
        ) : unavailable ? (
          <Text variant="secondary" color={colors.secondary}>
            Prices aren't available yet. Try again later.
          </Text>
        ) : (
          <View style={styles.options}>
            {offer?.yearly ? (
              <Option
                selected={choice === 'yearly'}
                onPress={() => setChoice('yearly')}
                title={`${offer.yearly.product.priceString} a year`}
                detail={
                  offer.yearly.product.pricePerMonthString
                    ? `${offer.yearly.product.pricePerMonthString} a month`
                    : null
                }
                label="Yearly"
              />
            ) : null}
            {offer?.monthly ? (
              <Option
                selected={choice === 'monthly'}
                onPress={() => setChoice('monthly')}
                title={`${offer.monthly.product.priceString} a month`}
                detail={null}
                label="Monthly"
              />
            ) : null}
          </View>
        )}

        <Button label="Subscribe" onPress={subscribe} busy={busy === 'buy'} disabled={!chosen || busy !== null} />
        <Pressable
          onPress={restorePurchases}
          disabled={busy !== null || !purchasesAvailable()}
          accessibilityRole="button"
          style={styles.restore}
        >
          <Text variant="secondary" color={colors.ink}>
            {busy === 'restore' ? 'Restoring…' : 'Restore purchases'}
          </Text>
        </Pressable>

        <Text variant="legal" color={colors.secondary}>
          Parso Pro renews automatically at the price shown until you cancel. Cancel any time in Settings at least 24
          hours before it renews. Payment is charged to your Apple Account.
        </Text>
        <View style={styles.links}>
          <Text variant="legal" color={colors.ink} onPress={() => Linking.openURL(TERMS_URL)} accessibilityRole="link">
            Terms of Use
          </Text>
          <Text
            variant="legal"
            color={colors.ink}
            onPress={() => Linking.openURL(PRIVACY_URL)}
            accessibilityRole="link"
          >
            Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type OptionProps = { selected: boolean; onPress: () => void; title: string; detail: string | null; label: string };

function Option({ selected, onPress, title, detail, label }: OptionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}, ${title}${detail ? `, ${detail}` : ''}`}
      style={[styles.option, selected && styles.optionSelected]}
    >
      <Text variant="rowTitle">{label}</Text>
      <View style={styles.optionPrice}>
        <Text variant="rowTitle">{title}</Text>
        {detail ? (
          <Text variant="secondary" color={colors.secondary}>
            {detail}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: upgrade.paddingX, paddingTop: upgrade.paddingTop, gap: upgrade.gap },
  benefits: { gap: upgrade.benefitGap },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: upgrade.checkGap },
  loading: { alignSelf: 'flex-start' },
  options: { gap: upgrade.optionGap },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: upgrade.optionHeight,
    paddingHorizontal: upgrade.optionPaddingX,
    borderRadius: radius.button,
    borderWidth: size.hairline,
    borderColor: colors.controlBorder,
  },
  optionSelected: { borderColor: colors.ink, borderWidth: upgrade.selectedBorder },
  optionPrice: { alignItems: 'flex-end' },
  restore: { alignSelf: 'center', minHeight: size.minTouch, justifyContent: 'center' },
  links: { flexDirection: 'row', gap: upgrade.linkGap, paddingBottom: upgrade.bottom },
});
