import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { IntroIllustration, type IntroScene } from '@/components/IntroIllustration';
import { ProgressDots } from '@/components/ProgressDots';
import { Text } from '@/components/Text';
import { useIntro } from '@/lib/intro';
import { colors, intro, size, spacing } from '@/theme';

const PAGES: { scene: IntroScene; title: string; body: string }[] = [
  {
    scene: 'save',
    title: 'Save from any app',
    body: "Tap Share on any post, reel, link or screenshot, then pick Parso. That's the whole job.",
  },
  {
    scene: 'sort',
    title: 'Sorted for you',
    body: 'Parso reads what you saved and files it into the right collection, tagged and ready.',
  },
  {
    scene: 'find',
    title: 'Find it by asking',
    body: 'Search in your own words, like “that pasta from Instagram,” and get it back.',
  },
];

// Designs 0.1 to 0.3. Finishing or skipping marks the intro seen, which swaps in the welcome screen.
export default function IntroScreen() {
  const insets = useSafeAreaInsets();
  const { markSeen } = useIntro();
  const [index, setIndex] = useState(0);
  const page = PAGES[index];
  const last = index === PAGES.length - 1;

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + intro.bottom }]}>
      <View style={styles.skipRow}>
        {!last ? (
          <Pressable onPress={markSeen} accessibilityRole="button" hitSlop={(size.minTouch - 20) / 2}>
            <Text variant="skip" color={colors.secondary}>
              Skip
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.middle}>
        <IntroIllustration scene={page.scene} />
        <Text variant="introTitle" accessibilityRole="header" style={styles.title}>
          {page.title}
        </Text>
        <Text variant="introBody" color={colors.secondary} style={styles.body}>
          {page.body}
        </Text>
      </View>

      <ProgressDots count={PAGES.length} index={index} />
      <View style={styles.button}>
        <Button label={last ? 'Get started' : 'Next'} onPress={() => (last ? markSeen() : setIndex(index + 1))} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.screenWide },
  skipRow: { height: size.minTouch, marginTop: intro.skipTop, alignItems: 'flex-end', justifyContent: 'center' },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: intro.circleToTitle, textAlign: 'center' },
  body: { marginTop: intro.titleToBody, textAlign: 'center', maxWidth: intro.bodyMaxWidth },
  button: { marginTop: intro.dotsToButton },
});
