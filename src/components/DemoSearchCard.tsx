import { Image, StyleSheet, View } from 'react-native';

import { SearchIcon } from '@/icons/SearchIcon';
import { colors, radius, size, welcome } from '@/theme';

import { Highlight } from './Highlight';
import { Text } from './Text';

// Static example on the welcome screen showing what asking in your own words looks like.
export function DemoSearchCard() {
  return (
    <View style={styles.card} accessible accessibilityLabel="Example: searching that pasta from instagram finds Garlic butter steak tortellini">
      <View style={styles.field}>
        <SearchIcon color={colors.secondary} size={welcome.fieldIcon} strokeWidth={size.tabIconStroke} />
        <Text variant="demoQuery">that pasta from instagram</Text>
      </View>
      <View style={styles.result}>
        <Image source={require('../../assets/welcome/demo-tortellini.jpg')} style={styles.thumb} />
        <View style={styles.resultText}>
          <Text variant="demoTitle" numberOfLines={1}>
            Garlic butter steak tortellini
          </Text>
          <Text variant="demoMeta" color={colors.secondary} numberOfLines={1}>
            <Highlight>Instagram</Highlight> reel, saved in Recipes
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
    padding: welcome.cardPadding,
  },
  field: {
    height: welcome.fieldHeight,
    borderRadius: radius.field,
    backgroundColor: colors.background,
    paddingHorizontal: welcome.fieldPaddingX,
    flexDirection: 'row',
    alignItems: 'center',
    gap: welcome.fieldIconGap,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: welcome.resultGap,
    marginTop: welcome.resultTop,
    marginHorizontal: welcome.resultPadding - welcome.cardPadding,
    marginBottom: welcome.resultPadding - welcome.cardPadding,
  },
  thumb: {
    width: welcome.resultThumb,
    height: welcome.resultThumb,
    borderRadius: radius.thumb,
  },
  resultText: { flex: 1 },
});
