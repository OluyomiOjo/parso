import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, size } from '@/theme';

// One white panel with 1px dividers between rows. Rows are never wrapped in their own cards.
export function ListPanel({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children);
  return (
    <View style={styles.panel}>
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 ? <View style={styles.divider} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel,
    borderRadius: radius.panel,
    overflow: 'hidden',
  },
  divider: {
    height: size.hairline,
    backgroundColor: colors.divider,
  },
});
