import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useState, type ComponentType } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';

import { BookmarkIcon } from '@/icons/BookmarkIcon';
import { CollectionsIcon } from '@/icons/CollectionsIcon';
import { SearchIcon } from '@/icons/SearchIcon';
import type { IconProps } from '@/icons/types';
import { YouIcon } from '@/icons/YouIcon';
import { colors, dock, size } from '@/theme';

import { AddButton } from './AddButton';
import { Text } from './Text';

const TABS: Record<string, { label: string; Icon: ComponentType<IconProps> }> = {
  index: { label: 'Parsos', Icon: BookmarkIcon },
  search: { label: 'Search', Icon: SearchIcon },
  collections: { label: 'Collections', Icon: CollectionsIcon },
  you: { label: 'You', Icon: YouIcon },
};

// Hidden while the keyboard is up (typing a search), so neither covers the field or the results.
function useKeyboardShown() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setShown(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return shown;
}

// The floating tab bar (owner decision, step 11): frosted glass over the content, rounded, with the black +
// beside it. Screens scroll underneath; size.addButtonClearance keeps their last item clear of it.
export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const keyboard = useKeyboardShown();
  if (keyboard) return null;
  const bottom = Math.max(insets.bottom - dock.homeIndicatorOverlap, dock.bottomMin);

  return (
    <View style={[styles.layer, { bottom }]} pointerEvents="box-none">
      <View style={[styles.shadow, styles.bar]}>
        <BlurView intensity={dock.blur} tint="systemChromeMaterialLight" style={styles.glass}>
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
        </BlurView>
      </View>
      <View style={styles.shadow}>
        <AddButton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: dock.sideGap,
    right: dock.sideGap,
    flexDirection: 'row',
    alignItems: 'center',
    gap: dock.addGap,
  },
  // The one shadow in the design system: soft, under the floating bar and the +.
  shadow: {
    shadowColor: colors.ink,
    shadowOpacity: dock.shadowOpacity,
    shadowRadius: dock.shadowRadius,
    shadowOffset: { width: 0, height: dock.shadowY },
  },
  bar: { flex: 1, height: dock.height, borderRadius: dock.radius },
  glass: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: dock.radius,
    overflow: 'hidden',
    borderWidth: size.hairline,
    borderColor: colors.divider,
    paddingHorizontal: size.tabBarPaddingX,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: size.minTouch,
    gap: size.tabLabelGap,
  },
  iconBox: {
    height: size.tabIcon,
    justifyContent: 'center',
  },
});
