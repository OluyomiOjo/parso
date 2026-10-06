import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import { PlusIcon } from '@/icons/PlusIcon';
import { colors, size } from '@/theme';

import { IconButton } from './IconButton';

// The floating black + on every tab: Add to Parso from anywhere. It sits just above the tab bar and steps out
// of the way while the keyboard is up (typing a search). Owner request, step 10.
export function AddButton({ bottom }: { bottom: number }) {
  const [keyboard, setKeyboard] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (keyboard) return null;
  return (
    <View style={[styles.wrap, { bottom: bottom + size.addButtonGap }]} pointerEvents="box-none">
      <IconButton label="Add to Parso" onPress={() => router.push('/add')} variant="ink">
        <PlusIcon color={colors.onInk} size={size.addButtonIcon} strokeWidth={size.addButtonStroke} />
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: size.addButtonGap },
});
