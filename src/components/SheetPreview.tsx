import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { SourceIcon } from '@/icons/SourceIcon';
import { metaLabel } from '@/lib/format';
import { displayUrl } from '@/lib/links';
import type { SaveDetail } from '@/lib/saves';
import { colors, radius, sheet } from '@/theme';

import { SourceLine } from './SourceLine';
import { Text } from './Text';

type Props = { save: SaveDetail; thumbnailUrl?: string };

// The top of the save sheet. While a picture may still come (or has come), a large card: the picture area
// keeps its height from the start, shows the source's icon with a gentle pulse while saving, and fades the
// picture in when it arrives. Once it's clear no picture will come (a note, or a filed link without one),
// a compact row instead, so there's never a large empty box. Owner-approved over the design's 48pt row.
export function SheetPreview({ save, thumbnailUrl }: Props) {
  const title = save.title ?? (save.url ? displayUrl(save.url) : 'Saving…');
  const source = <SourceLine kind={save.kind} source={save.source} text={metaLabel(save)} variant="secondary" />;
  const pictureExpected = Boolean(save.thumbnail_path) || (!save.processed_at && save.kind !== 'text');

  if (!pictureExpected) {
    return (
      <View style={styles.row}>
        <View style={styles.thumb}>
          <SourceIcon kind={save.kind} source={save.source} size={sheet.previewBrandIcon} />
        </View>
        <View style={styles.rowText}>
          <Text variant="rowTitle" numberOfLines={2}>
            {title}
          </Text>
          {source}
        </View>
      </View>
    );
  }

  return (
    <View>
      <PictureArea save={save} thumbnailUrl={thumbnailUrl} />
      <Text variant="rowTitle" numberOfLines={2} style={styles.caption}>
        {title}
      </Text>
      <View style={styles.source}>{source}</View>
    </View>
  );
}

function PictureArea({ save, thumbnailUrl }: Props) {
  const [loaded, setLoaded] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(0)).current;

  // The icon breathes until the picture has loaded, unless the person has asked for less motion.
  useEffect(() => {
    if (loaded) return;
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce || cancelled) return;
      const step = (toValue: number) =>
        Animated.timing(pulse, {
          toValue,
          duration: sheet.previewPulseMs,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        });
      loop = Animated.loop(Animated.sequence([step(sheet.previewPulseMin), step(1)]));
      loop.start();
    });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [loaded, pulse]);

  const onLoad = () => {
    setLoaded(true);
    Animated.timing(fade, { toValue: 1, duration: sheet.previewFadeMs, useNativeDriver: true }).start();
  };

  return (
    <View style={styles.picture}>
      {!loaded ? (
        <Animated.View style={{ opacity: pulse }}>
          <SourceIcon kind={save.kind} source={save.source} size={sheet.previewBrandIcon} />
        </Animated.View>
      ) : null}
      {thumbnailUrl ? (
        <Animated.Image
          source={{ uri: thumbnailUrl }}
          onLoad={onLoad}
          style={[StyleSheet.absoluteFill, { opacity: fade }]}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  picture: {
    height: sheet.previewHeight,
    borderRadius: radius.panel,
    overflow: 'hidden',
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { marginTop: sheet.previewCaptionTop },
  source: { marginTop: sheet.previewTitleToSource },
  row: { flexDirection: 'row', alignItems: 'center', gap: sheet.previewGap },
  thumb: {
    width: sheet.previewThumb,
    height: sheet.previewThumb,
    borderRadius: radius.thumb,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: sheet.previewTitleToSource },
});
