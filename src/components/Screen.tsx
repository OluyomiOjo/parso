import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type ScreenProps = {
  children?: ReactNode;
  wide?: boolean; // intro and welcome use the wider side padding
};

export function Screen({ children, wide = false }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.content, { paddingHorizontal: wide ? spacing.screenWide : spacing.screen }]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
});
