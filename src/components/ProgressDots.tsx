import { StyleSheet, View } from 'react-native';

import { colors, intro } from '@/theme';

// Where you are in the intro: the current step is a short black bar, the others grey dots.
export function ProgressDots({ count, index }: { count: number; index: number }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`Step ${index + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, i === index && styles.active]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: intro.dotGap },
  dot: { width: intro.dot, height: intro.dot, borderRadius: intro.dot / 2, backgroundColor: colors.controlBorder },
  active: { width: intro.dotActiveWidth, backgroundColor: colors.ink },
});
