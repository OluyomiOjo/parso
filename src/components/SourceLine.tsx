import { StyleSheet, View } from 'react-native';

import { CheckIcon } from '@/icons/CheckIcon';
import { SourceIcon } from '@/icons/SourceIcon';
import { colors, size, tabularNums, week, type TypeVariant } from '@/theme';

import { HighlightedText } from './HighlightedText';

type Props = {
  kind: string;
  source: string;
  text: string;
  variant?: TypeVariant;
  highlight?: string[];
  done?: boolean; // a small tick at the end for saves marked done (Your week in Parso)
};

// "[icon] Instagram, 2 days ago": the source mark, then the meta text, on one line.
export function SourceLine({ kind, source, text, variant = 'rowMeta', highlight = [], done = false }: Props) {
  return (
    <View style={styles.row}>
      <SourceIcon kind={kind} source={source} />
      <HighlightedText
        text={text}
        terms={highlight}
        variant={variant}
        color={colors.secondary}
        numberOfLines={1}
        style={[styles.text, tabularNums]}
      />
      {done ? (
        <View accessible accessibilityLabel="Done">
          <CheckIcon color={colors.secondary} size={week.doneIcon} strokeWidth={size.iconStroke} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: size.sourceIconGap },
  text: { flexShrink: 1 },
});
