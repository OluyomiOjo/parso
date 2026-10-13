import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';

import { Button } from '@/components/Button';
import { CollectionCircle } from '@/components/CollectionCircle';
import { ListPanel } from '@/components/ListPanel';
import { SourceLine } from '@/components/SourceLine';
import { Text } from '@/components/Text';
import { CheckIcon } from '@/icons/CheckIcon';
import { SourceIcon } from '@/icons/SourceIcon';
import { useCollectionOverview } from '@/lib/collections';
import { useOnline } from '@/lib/connection';
import {
  percentSaved,
  proHeadline,
  proMoment,
  proNumbers,
  TRIAL_REMINDER_LINE,
  trialButton,
  trialTerms,
} from '@/lib/plan';
import {
  cancelledPurchase,
  type Offer,
  openedAfterFirstSave,
  purchasesAvailable,
  takePendingSave,
  useMyNumbers,
  useOffer,
  usePlan,
  usePurchase,
  type WaitingSave,
  waitingSave,
} from '@/lib/pro';
import { useThumbnailUrls } from '@/lib/saves';
import { circle, colors, radius, size, spacing, upgrade } from '@/theme';

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'; // Apple's standard terms
const PRIVACY_URL = 'https://parso.ai/privacy';
const BUY_FAILED = "Couldn't complete the purchase. You weren't charged. Check your connection and try again.";
const RESTORE_NONE = 'No Parso Pro subscription was found for this Apple Account.';
const RESTORE_FAILED = "Couldn't restore purchases. Check your connection and try again.";
// Outcomes, not features, and only what Pro adds or keeps going (owner decision after build 22).
const BENEFITS = ['Save everything, with no limit', 'Find anything you saved, by asking', 'Everything sorted for you'];
const MAX_CIRCLES = 8;

type Choice = 'yearly' | 'monthly';

// "14 days free. $3.33 a month. Save 33%.", from Apple's own prices (owner requests after builds 18 and 22).
function yearlyDetail(offer: Offer): string | null {
  const perMonth = offer.yearly?.product.pricePerMonthString;
  const saved = percentSaved(offer.monthly?.product.price, offer.yearly?.product.price);
  const parts = [
    offer.trial ? `${offer.trial} days free.` : null,
    perMonth ? `${perMonth} a month.` : null,
    saved ? `Save ${saved}%.` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}

// Parso Pro: opened when a free account reaches its 50th save, and from the You tab. It's about the person and the
// moment (owner decisions after builds 20 and 21): when a save was just stopped, what happened, that save waiting,
// and the plans first so they can finish saving; at the limit from the You tab, their own collections and numbers;
// before the limit, what Pro gives. Prices come from Apple in the viewer's own currency; the button names the price. Apple's required wording
// and links sit at the bottom.
export default function UpgradeSheet() {
  const online = useOnline();
  const { data: plan } = usePlan();
  const { data: numbers } = useMyNumbers();
  const { data: offer, isPending, isError } = useOffer();
  const [waiting] = useState<WaitingSave | null>(waitingSave);
  const [first] = useState(openedAfterFirstSave);
  const { data: collections } = useCollectionOverview();
  const moment = proMoment(plan, Boolean(waiting), first);
  const trial = offer?.trial ?? null;
  // Their collections only where the page is about what they've built, not mid-save or before the limit.
  const circles = moment === 'limit' ? (collections ?? []).slice(0, MAX_CIRCLES) : [];
  const { data: covers } = useThumbnailUrls(circles.flatMap((c) => (c.cover ? [c.cover] : [])));
  const numbersLine = proNumbers(moment, plan, numbers, trial);
  const { buy, restore } = usePurchase();
  const [choice, setChoice] = useState<Choice>('yearly');
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);

  const chosen: PurchasesPackage | null = offer?.[choice] ?? null;
  const loading = purchasesAvailable() && isPending;
  // "Subscribe for $39.99 a year", or "Start free for 14 days" on Yearly with the trial: exactly what happens, with
  // the price after the trial right under it, as Apple asks.
  const price = chosen ? `${chosen.product.priceString} a ${choice === 'yearly' ? 'year' : 'month'}` : null;
  const trialChosen = Boolean(trial && choice === 'yearly' && chosen);
  const buttonLabel = trialChosen && trial ? trialButton(trial) : price ? `Subscribe for ${price}` : 'Subscribe';
  const unavailable = !purchasesAvailable() || isError || (!isPending && !offer?.yearly && !offer?.monthly);

  const finish = (bought: boolean) => {
    router.back();
    const retry = takePendingSave();
    const title = bought && trialChosen && trial ? `Your ${trial}-day free trial has started` : "You're on Parso Pro";
    Alert.alert(title, retry ? 'Saving what you shared now.' : undefined);
    retry?.();
  };

  const subscribe = async () => {
    if (!chosen) return;
    setBusy('buy');
    try {
      if (await buy(chosen)) finish(true);
    } catch (error) {
      if (!cancelledPurchase(error)) Alert.alert(BUY_FAILED);
    } finally {
      setBusy(null);
    }
  };

  const restorePurchases = async () => {
    setBusy('restore');
    try {
      if (await restore()) finish(false);
      else Alert.alert(RESTORE_NONE);
    } catch {
      Alert.alert(RESTORE_FAILED);
    } finally {
      setBusy(null);
    }
  };

  // What Pro gives, and the plans with the button; their order depends on the moment.
  const promises = (
    <View style={styles.benefits}>
      {/* The subscription's name, as Apple asks, heading what it gives. */}
      <Text variant="sectionHeading" accessibilityRole="header">
        Parso Pro
      </Text>
      {BENEFITS.map((benefit) => (
        <View key={benefit} style={styles.benefit}>
          <CheckIcon color={colors.ink} size={upgrade.checkIcon} strokeWidth={size.iconStroke} />
          <Text style={styles.benefitText}>{benefit}</Text>
        </View>
      ))}
    </View>
  );
  const pricing = (
    <>
      {loading ? (
        <ActivityIndicator color={colors.secondary} style={styles.loading} />
      ) : unavailable ? (
        <Text variant="secondary" color={colors.secondary}>
          {online
            ? "Prices aren't available yet. Try again later."
            : "Prices need the internet. Try again when you're back online."}
        </Text>
      ) : (
        <View style={styles.options}>
          {offer?.yearly ? (
            <Option
              selected={choice === 'yearly'}
              onPress={() => setChoice('yearly')}
              title={`${offer.yearly.product.priceString} a year`}
              detail={yearlyDetail(offer)}
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

      <View style={styles.buy}>
        <Button label={buttonLabel} onPress={subscribe} busy={busy === 'buy'} disabled={!chosen || busy !== null} />
        {trialChosen && chosen ? (
          <Text variant="secondary" color={colors.secondary} style={styles.center}>
            {`${trialTerms(chosen.product.priceString)}\n${TRIAL_REMINDER_LINE}`}
          </Text>
        ) : (
          <Text variant="secondary" color={colors.secondary} style={styles.center}>
            Cancel anytime in Settings.
          </Text>
        )}
      </View>
    </>
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.sheet}>
      <ScrollView contentContainerStyle={styles.content}>
        {circles.length ? (
          <View>
            <Text variant="sectionHeading" style={styles.circlesLabel}>
              Your Parsos
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.bleed}
              contentContainerStyle={styles.circles}
            >
              {circles.map((c) => (
                <CollectionCircle key={c.id} collection={c} coverUrl={c.cover ? covers?.[c.cover] : undefined} />
              ))}
            </ScrollView>
          </View>
        ) : null}
        <View style={styles.intro}>
          <Text variant="sheetTitle" accessibilityRole="header">
            {proHeadline(moment, trial)}
          </Text>
          {numbersLine ? <Text color={colors.secondary}>{numbersLine}</Text> : null}
        </View>
        {waiting ? <WaitingCard save={waiting} /> : null}

        {moment === 'stopped' ? (
          <>
            {pricing}
            {promises}
          </>
        ) : (
          <>
            {promises}
            {pricing}
          </>
        )}
        <View style={styles.choices}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.choice}>
            <Text variant="secondary" color={colors.ink}>
              Not now
            </Text>
          </Pressable>
          <Pressable
            onPress={restorePurchases}
            disabled={busy !== null || !purchasesAvailable()}
            accessibilityRole="button"
            style={styles.choice}
          >
            <Text variant="secondary" color={colors.ink}>
              {busy === 'restore' ? 'Restoring…' : 'Restore purchases'}
            </Text>
          </Pressable>
        </View>

        <Text variant="legal" color={colors.secondary}>
          Parso Pro renews automatically at the price shown until you cancel. With the free trial, the first payment is
          taken when the trial ends. Cancel any time in Settings at least 24 hours before it renews or the trial ends.
          Payment is charged to your Apple Account.
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

// The save the free limit stopped, so the choice is about keeping it (shown only when it goes through after
// subscribing).
function WaitingCard({ save }: { save: WaitingSave }) {
  return (
    <ListPanel>
      <View style={styles.waiting} accessible accessibilityLabel={`${save.title}. Waiting to save`}>
        {save.imageUri ? (
          <Image source={{ uri: save.imageUri }} style={styles.thumb} accessibilityIgnoresInvertColors />
        ) : (
          <View style={styles.thumb}>
            <SourceIcon kind={save.kind} source={save.source} size={size.thumbIcon} />
          </View>
        )}
        <View style={styles.waitingText}>
          <Text variant="rowTitle" numberOfLines={2}>
            {save.title}
          </Text>
          <SourceLine kind={save.kind} source={save.source} text="Waiting to save" />
        </View>
      </View>
    </ListPanel>
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
  benefitText: { flexShrink: 1 },
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
  circlesLabel: { marginBottom: spacing.headingToPanel },
  // The circle row scrolls to the sheet's edges but starts in line with the text.
  bleed: { marginHorizontal: -upgrade.paddingX },
  circles: { paddingHorizontal: upgrade.paddingX, gap: circle.gap },
  intro: { gap: spacing.sm },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.rowGap,
    paddingHorizontal: spacing.rowPaddingX,
    paddingVertical: spacing.rowPaddingY,
  },
  thumb: {
    width: size.thumb,
    height: size.thumb,
    borderRadius: radius.thumb,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: { flex: 1 },
  buy: { gap: spacing.sm },
  center: { textAlign: 'center' },
  choices: { flexDirection: 'row', justifyContent: 'space-between' },
  choice: { minHeight: size.minTouch, justifyContent: 'center' },
  links: { flexDirection: 'row', gap: upgrade.linkGap, paddingBottom: upgrade.bottom },
});
