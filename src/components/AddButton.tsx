import { router } from 'expo-router';

import { PlusIcon } from '@/icons/PlusIcon';
import { colors, size } from '@/theme';

import { IconButton } from './IconButton';

// The floating black + on every tab: opens the Add sheet (Link, Note, Photo) from anywhere. It sits beside the
// floating tab bar, which places it and hides both while the keyboard is up. Owner requests, steps 10 and 11.
export function AddButton() {
  return (
    <IconButton label="Add to Parso" onPress={() => router.push('/add-menu')} variant="ink">
      <PlusIcon color={colors.onInk} size={size.addButtonIcon} strokeWidth={size.addButtonStroke} />
    </IconButton>
  );
}
