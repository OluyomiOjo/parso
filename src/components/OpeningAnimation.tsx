import { useShareIntentContext } from 'expo-share-intent';
import { type ReactNode, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { LinkIcon } from '@/icons/LinkIcon';
import { NoteIcon } from '@/icons/NoteIcon';
import { PhotoIcon } from '@/icons/PhotoIcon';
import { SourceIcon } from '@/icons/SourceIcon';
import { colors, opening as o, size } from '@/theme';

// The things people save, popping out of the logo and back in (owner request after build 21).
const ICONS = [
  <SourceIcon key="instagram" kind="link" source="instagram" size={o.icon} />,
  <LinkIcon key="link" color={colors.ink} size={o.icon} strokeWidth={size.iconStroke} />,
  <SourceIcon key="tiktok" kind="link" source="tiktok" size={o.icon} />,
  <PhotoIcon key="photo" color={colors.ink} size={o.icon} strokeWidth={size.iconStroke} />,
  <SourceIcon key="youtube" kind="link" source="youtube" size={o.icon} />,
  <NoteIcon key="note" color={colors.ink} size={o.icon} strokeWidth={size.iconStroke} />,
  <SourceIcon key="x" kind="link" source="x" size={o.icon} />,
  <SourceIcon key="pinterest" kind="link" source="pinterest" size={o.icon} />,
];

const OUT = { damping: 11, stiffness: 140, mass: 0.8 }; // a little overshoot, so they pop
const BACK = Easing.in(Easing.cubic); // pulled back in, faster as they go
const GULP = { damping: 8, stiffness: 220 };

let played = false; // once per launch: never on coming back to Parso
export const openingPlayed = () => played;

// Starts as an exact copy of the launch screen, so the hand-off can't be seen, plays for about 1.6 seconds, then
// fades into Parso. Not played when Parso was opened by sharing into it (the save sheet comes first), or with Reduce
// Motion on. A tap skips it.
export function OpeningAnimation({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const { isReady: shareChecked, hasShareIntent } = useShareIntentContext();
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(!played);
  const logo = useSharedValue(1);
  const cover = useSharedValue(1);
  const progress = ICONS.map(() => useSharedValue(0)); // ICONS never changes length, so the hooks stay in order

  const finish = () => {
    played = true;
    setVisible(false);
    onDone();
  };
  const fadeOut = () => {
    cover.value = withTiming(0, { duration: o.fadeMs }, (done) => done && runOnJS(finish)());
  };

  // Safety net: if the share check never answers, the cover still leaves.
  useEffect(() => {
    if (!visible || !ready || shareChecked) return;
    const timer = setTimeout(fadeOut, 1500);
    return () => clearTimeout(timer);
  }, [visible, ready, shareChecked]);

  useEffect(() => {
    if (!visible || !ready || !shareChecked) return;
    if (hasShareIntent || reduceMotion) return fadeOut();
    // Out: a small squeeze, then each icon springs out in turn while the logo swells.
    logo.value = withSequence(
      withTiming(0.9, { duration: 140, easing: Easing.out(Easing.quad) }),
      withSpring(1.06, OUT),
    );
    const outEnd = 140 + o.stagger * ICONS.length + o.outMs;
    progress.forEach((p, i) => {
      p.value = withDelay(
        140 + i * o.stagger,
        withSequence(
          withSpring(1, OUT),
          withDelay(o.holdMs + i * (o.stagger / 2), withTiming(0, { duration: o.inMs, easing: BACK })),
        ),
      );
    });
    // Back in: the logo gulps them up, settles, and the screen fades into Parso.
    const inEnd = outEnd + o.holdMs + o.inMs;
    const gulp = setTimeout(() => {
      logo.value = withSequence(withSpring(1.12, GULP), withSpring(1, GULP));
    }, inEnd - 60);
    const leave = setTimeout(fadeOut, inEnd + 220);
    return () => {
      clearTimeout(gulp);
      clearTimeout(leave);
    };
  }, [visible, ready, shareChecked, hasShareIntent, reduceMotion]);

  const coverStyle = useAnimatedStyle(() => ({ opacity: cover.value }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: logo.value }] }));

  if (!visible) return null;
  return (
    <Animated.View style={[styles.cover, coverStyle]} pointerEvents="box-only">
      <Pressable style={styles.center} onPress={fadeOut} accessibilityRole="button" accessibilityLabel="Skip">
        {ICONS.map((icon, i) => (
          <Bubble key={i} index={i} progress={progress[i]}>
            {icon}
          </Bubble>
        ))}
        <Animated.View style={logoStyle}>
          <Image source={require('../../assets/brand/icon-black.png')} style={styles.logo} resizeMode="contain" />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function Bubble({ index, progress, children }: { index: number; progress: SharedValue<number>; children: ReactNode }) {
  const angle = (index / ICONS.length) * Math.PI * 2 - Math.PI / 2; // starting at the top, going round
  const tilt = index % 2 ? -12 : 12;
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 2),
    transform: [
      { translateX: Math.cos(angle) * o.ring * progress.value },
      { translateY: Math.sin(angle) * o.ring * progress.value },
      { scale: 0.3 + 0.7 * progress.value },
      { rotate: `${tilt * (1 - progress.value)}deg` },
    ],
  }));
  return <Animated.View style={[styles.bubble, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFill, backgroundColor: o.background, zIndex: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: o.logo, height: o.logo * o.logoAspect },
  bubble: {
    position: 'absolute',
    width: o.bubble,
    height: o.bubble,
    borderRadius: o.bubble / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
