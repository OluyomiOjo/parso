import * as Linking from 'expo-linking';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

import { CloseIcon } from '@/icons/CloseIcon';
import { type ScreenshotState, setScreenshotCheck } from '@/lib/screenshots';
import { colors, radius, screenshotsCard, size } from '@/theme';

import { Button } from './Button';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Props = {
  state: ScreenshotState;
  saving: boolean;
  onTurnOn: () => void;
  onNotNow: () => void;
  onSave: () => Promise<number>;
  onChanged: () => void;
};

const count = (n: number) => `${n} new screenshot${n === 1 ? '' : 's'}`;

// Parsos: offers screenshots taken since Parso was last opened, or asks once to turn the check on.
export function NewScreenshotsCard({ state, saving, onTurnOn, onNotNow, onSave, onChanged }: Props) {
  const [failed, setFailed] = useState(0);

  if (state.status === 'ask') {
    return (
      <Card
        title="Save screenshots as you take them"
        body="Let Parso check for new screenshots when you open it. Nothing is saved unless you tap Save."
        primary={{ label: 'Turn on', onPress: onTurnOn }}
        secondary={{ label: 'Not now', onPress: onNotNow }}
      />
    );
  }
  if (state.status === 'needsFullAccess') {
    return (
      <Card
        title="Parso can't see new screenshots"
        body="Allow full photo access in Settings, Parso, Photos, so Parso can offer your new screenshots."
        primary={{ label: 'Open Settings', onPress: () => Linking.openSettings() }}
        secondary={{
          label: 'Turn off',
          onPress: () => setScreenshotCheck(false).then(onChanged),
        }}
      />
    );
  }
  if (state.status !== 'new') return null;

  // One slim row (owner request after build 16): the newest screenshot, how many, then Save and a close button.
  const total = state.screenshots.length;
  const more = total - 1;
  return (
    <View style={styles.row}>
      <View>
        <Image source={{ uri: state.screenshots[0].uri }} style={styles.thumb} accessibilityIgnoresInvertColors />
        {more > 0 ? (
          <View style={styles.more}>
            <Text variant="meta" color={colors.onInk}>{`+${more}`}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.rowText}>
        <Text variant="rowTitle" numberOfLines={1}>
          {count(total)}
        </Text>
        {failed ? (
          <Text variant="meta" numberOfLines={2}>
            {`${failed} couldn't be saved. Check your connection and tap Save again.`}
          </Text>
        ) : null}
      </View>
      <PressableScale
        onPress={() => void onSave().then(setFailed)}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel={`Save ${count(total)}`}
        accessibilityState={{ busy: saving }}
        style={styles.save}
      >
        {saving ? (
          <ActivityIndicator color={colors.onInk} />
        ) : (
          <Text variant="pill" color={colors.onInk}>
            Save
          </Text>
        )}
      </PressableScale>
      <Pressable
        onPress={onNotNow}
        accessibilityRole="button"
        accessibilityLabel="Not now"
        style={({ pressed }) => [styles.close, pressed && styles.pressed]}
      >
        <CloseIcon color={colors.secondary} size={screenshotsCard.closeIcon} strokeWidth={size.iconStroke} />
      </Pressable>
    </View>
  );
}

type Action = { label: string; onPress: () => void; busy?: boolean };

function Card({
  title,
  body,
  primary,
  secondary,
}: {
  title: string;
  body?: string;
  primary: Action;
  secondary: Action;
}) {
  return (
    <View style={styles.card}>
      <Text variant="rowTitle">{title}</Text>
      {body ? (
        <Text variant="secondary" color={colors.secondary}>
          {body}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button label={primary.label} onPress={primary.onPress} busy={primary.busy} />
        </View>
        <View style={styles.action}>
          <Button label={secondary.label} onPress={secondary.onPress} variant="secondary" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderRadius: radius.panel,
    padding: screenshotsCard.padding,
    gap: screenshotsCard.thumbGap,
  },
  thumb: {
    width: screenshotsCard.thumb,
    height: screenshotsCard.thumb,
    borderRadius: radius.thumb,
    backgroundColor: colors.divider,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: screenshotsCard.rowGap,
    backgroundColor: colors.panel,
    borderRadius: radius.panel,
    paddingVertical: screenshotsCard.rowPaddingY,
    paddingLeft: screenshotsCard.rowPaddingY,
    paddingRight: screenshotsCard.rowPaddingRight,
  },
  rowText: { flex: 1 },
  more: {
    position: 'absolute',
    right: screenshotsCard.moreInset,
    bottom: screenshotsCard.moreInset,
    paddingHorizontal: screenshotsCard.morePaddingX,
    borderRadius: screenshotsCard.moreRadius,
    backgroundColor: colors.scrim,
  },
  save: {
    height: size.pillHeight,
    minWidth: screenshotsCard.saveMinWidth,
    paddingHorizontal: screenshotsCard.savePaddingX,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: { width: size.minTouch, height: size.minTouch, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  actions: { flexDirection: 'row', gap: screenshotsCard.actionGap, marginTop: screenshotsCard.textToActions },
  action: { flex: 1 },
});
