import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { tap } from '@/lib/haptics';
import { press, reorder } from '@/theme';

type Props<T> = {
  items: T[];
  keyOf: (item: T) => string;
  horizontal?: boolean;
  extent: number; // each item's length along the list, gap included
  crossSize: number; // the list's height (horizontal) or width (vertical)
  renderItem: (item: T) => ReactNode;
  onPress?: (item: T) => void;
  onReorder: (keys: string[]) => void;
  onDragChange?: (dragging: boolean) => void; // so a scroll view around it can pause while dragging
};

type Order = Record<string, number>;
const orderOf = (keys: string[]): Order => Object.fromEntries(keys.map((key, i) => [key, i]));

// A row or column of same-size items that can be rearranged: press and hold an item, drag it, and the others
// slide aside; letting go reports the new order. A quick tap is a normal press.
export function ReorderList<T>({
  items,
  keyOf,
  horizontal = false,
  extent,
  crossSize,
  renderItem,
  onPress,
  onReorder,
  onDragChange,
}: Props<T>) {
  const keys = items.map(keyOf);
  const order = useSharedValue<Order>(orderOf(keys));
  const joined = keys.join(',');
  // A new list from the server (or the screen's own optimistic update) resets the positions.
  useEffect(() => {
    order.value = orderOf(joined ? joined.split(',') : []);
  }, [joined, order]);

  const length = items.length * extent;
  return (
    <View style={horizontal ? { width: length, height: crossSize } : { height: length, width: crossSize }}>
      {items.map((item) => (
        <Item
          key={keyOf(item)}
          id={keyOf(item)}
          count={items.length}
          order={order}
          horizontal={horizontal}
          extent={extent}
          crossSize={crossSize}
          onPress={onPress ? () => onPress(item) : undefined}
          onDrop={(next) => onReorder(Object.keys(next).sort((a, b) => next[a] - next[b]))}
          onDragChange={onDragChange}
        >
          {renderItem(item)}
        </Item>
      ))}
    </View>
  );
}

type ItemProps = {
  id: string;
  count: number;
  order: SharedValue<Order>;
  horizontal: boolean;
  extent: number;
  crossSize: number;
  onPress?: () => void;
  onDrop: (order: Order) => void;
  onDragChange?: (dragging: boolean) => void;
  children: ReactNode;
};

function Item({ id, count, order, horizontal, extent, crossSize, onPress, onDrop, onDragChange, children }: ItemProps) {
  const dragging = useSharedValue(false);
  const pressed = useSharedValue(false); // shrinks a touch under the finger, like every other card
  const offset = useSharedValue((order.value[id] ?? 0) * extent); // where the item is drawn while dragging
  const start = useSharedValue(0);

  const changed = (value: boolean) => onDragChange?.(value);

  const pan = Gesture.Pan()
    .activateAfterLongPress(reorder.holdMs)
    .onStart(() => {
      dragging.value = true;
      start.value = order.value[id] * extent;
      offset.value = start.value;
      runOnJS(changed)(true);
    })
    .onUpdate((event) => {
      offset.value = start.value + (horizontal ? event.translationX : event.translationY);
      const target = Math.max(0, Math.min(count - 1, Math.round(offset.value / extent)));
      const current = order.value[id];
      if (target === current) return;
      // Move the item to its new slot; everything between shifts one place toward where it came from.
      const next: Order = { ...order.value };
      for (const key of Object.keys(next)) {
        const at = next[key];
        if (key === id) next[key] = target;
        else if (target > current && at > current && at <= target) next[key] = at - 1;
        else if (target < current && at >= target && at < current) next[key] = at + 1;
      }
      order.value = next;
    })
    .onFinalize(() => {
      if (!dragging.value) return;
      dragging.value = false;
      offset.value = withSpring(order.value[id] * extent, reorder.spring);
      runOnJS(onDrop)(order.value);
      runOnJS(changed)(false);
      runOnJS(tap)();
    });

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      pressed.value = true;
    })
    .onFinalize(() => {
      pressed.value = false;
    })
    .onEnd((_event, success) => {
      if (success && onPress) runOnJS(onPress)();
    });

  const style = useAnimatedStyle(() => {
    const place = dragging.value ? offset.value : withTiming(order.value[id] * extent, { duration: reorder.slideMs });
    return {
      transform: [
        horizontal ? { translateX: place } : { translateY: place },
        {
          scale: dragging.value
            ? withTiming(reorder.liftScale, { duration: reorder.slideMs })
            : withSpring(pressed.value ? press.scale : 1, { damping: press.damping, stiffness: press.stiffness }),
        },
      ],
      zIndex: dragging.value ? 1 : 0,
      opacity: withTiming(dragging.value ? reorder.liftOpacity : 1, { duration: reorder.slideMs }),
    };
  });

  return (
    <GestureDetector gesture={Gesture.Race(pan, tapGesture)}>
      <Animated.View style={[styles.item, horizontal ? { height: crossSize } : { width: crossSize }, style]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  item: { position: 'absolute', left: 0, top: 0 },
});
