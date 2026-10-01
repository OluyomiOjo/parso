import type { BottomTabBarProps } from 'expo-router/tabs';
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BookmarkIcon } from '@/icons/BookmarkIcon';
import { CollectionsIcon } from '@/icons/CollectionsIcon';
import { SearchIcon } from '@/icons/SearchIcon';
import type { IconProps } from '@/icons/types';
import { YouIcon } from '@/icons/YouIcon';
import { colors, size } from '@/theme';

import { Text } from './Text';

const TABS: Record<string, { label: string; Icon: ComponentType<IconProps> }> = {
  index: { label: 'My Parsos', Icon: BookmarkIcon },
  search: { label: 'Search', Icon: SearchIcon },
  collections: { label: 'Collections', Icon: CollectionsIcon },
  you: { label: 'You', Icon: YouIcon },
};

export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + size.tabBarPaddingBottom }]}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        const color = focused ? colors.ink : colors.secondary;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            style={styles.tab}
          >
            <View style={styles.iconBox}>
              <tab.Icon
                color={color}
                size={size.tabIcon}
                strokeWidth={focused ? size.tabIconStrokeActive : size.tabIconStroke}
                filled={focused}
              />
            </View>
            <Text variant={focused ? 'tabLabelActive' : 'tabLabel'} color={color} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: size.hairline,
    borderTopColor: colors.divider,
    paddingTop: size.tabBarPaddingTop,
    paddingHorizontal: size.tabBarPaddingX,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    minHeight: size.minTouch,
    gap: size.tabLabelGap,
  },
  iconBox: {
    height: size.tabIcon,
    justifyContent: 'center',
  },
});
