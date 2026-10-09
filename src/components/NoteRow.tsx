import { Pressable, StyleSheet, View } from 'react-native';

import { PinIcon } from '@/icons/PinIcon';
import { relativeTime } from '@/lib/format';
import { openSave } from '@/lib/notes';
import type { SaveListItem } from '@/lib/saves';
import { colors, size, spacing, tabularNums } from '@/theme';

import { Text } from './Text';

// A row in the Notes list: the title, the next line, and when it was last edited, like Apple Notes.
export function NoteRow({ save }: { save: SaveListItem }) {
  const title = save.title ?? 'New note';
  const meta = `Edited ${relativeTime(save.edited_at ?? save.created_at)}`;
  return (
    <Pressable
      onPress={() => openSave(save)}
      accessibilityRole="button"
      accessibilityLabel={`${save.pinned ? 'Pinned. ' : ''}${title}. ${meta}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text variant="rowTitle" numberOfLines={1}>
        {title}
      </Text>
      {save.snippet ? (
        <Text variant="secondary" color={colors.secondary} numberOfLines={1}>
          {save.snippet}
        </Text>
      ) : null}
      <View style={styles.meta}>
        {save.pinned ? (
          <PinIcon color={colors.secondary} size={size.sourceIcon} strokeWidth={size.iconStroke} filled />
        ) : null}
        <Text variant="rowMeta" color={colors.secondary} style={tabularNums}>
          {meta}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.rowPaddingX, paddingVertical: spacing.rowPaddingY },
  meta: { flexDirection: 'row', alignItems: 'center', gap: size.sourceIconGap },
  pressed: { backgroundColor: colors.divider },
});
