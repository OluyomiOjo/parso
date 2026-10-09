import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { type ScreenshotState, setScreenshotCheck } from '@/lib/screenshots';
import { colors, radius, screenshotsCard } from '@/theme';

import { Button } from './Button';
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

  const shown = state.screenshots.slice(0, screenshotsCard.maxThumbs);
  return (
    <Card
      title={`${count(state.screenshots.length)} since you last opened Parso`}
      body={failed ? `${failed} couldn't be saved. Check your connection and tap Save again.` : undefined}
      thumbs={shown.map((s) => s.uri)}
      primary={{
        label: saving ? 'Saving…' : 'Save',
        onPress: () => onSave().then(setFailed),
        busy: saving,
      }}
      secondary={{ label: 'Not now', onPress: onNotNow }}
    />
  );
}

type Action = { label: string; onPress: () => void; busy?: boolean };

function Card({
  title,
  body,
  thumbs,
  primary,
  secondary,
}: {
  title: string;
  body?: string;
  thumbs?: string[];
  primary: Action;
  secondary: Action;
}) {
  return (
    <View style={styles.card}>
      {thumbs?.length ? (
        <View style={styles.thumbs}>
          {thumbs.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.thumb} accessibilityIgnoresInvertColors />
          ))}
        </View>
      ) : null}
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
  thumbs: { flexDirection: 'row', gap: screenshotsCard.thumbGap, marginBottom: screenshotsCard.thumbGap },
  thumb: {
    width: screenshotsCard.thumb,
    height: screenshotsCard.thumb,
    borderRadius: radius.thumb,
    backgroundColor: colors.divider,
  },
  actions: { flexDirection: 'row', gap: screenshotsCard.actionGap, marginTop: screenshotsCard.textToActions },
  action: { flex: 1 },
});
