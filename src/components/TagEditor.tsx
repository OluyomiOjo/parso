import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { CloseIcon } from '@/icons/CloseIcon';
import { colors, detail, radius, sheet, size, spacing, type } from '@/theme';

import { pillStyles } from './Pill';
import { Text } from './Text';

export const MAX_TAGS = 10;
const TAG_MAX_LENGTH = 30;

type Props = { tags: string[]; onChange: (tags: string[]) => void };

// Tags as pills with an ×, then a field to add one. Tags are kept lowercase, like the AI writes them.
export function TagEditor({ tags, onChange }: Props) {
  const [draft, setDraft] = useState('');
  const full = tags.length >= MAX_TAGS;

  const add = () => {
    const tag = draft.trim().toLowerCase().replace(/\s+/g, ' ');
    if (tag && !tags.includes(tag) && !full) onChange([...tags, tag]);
    setDraft('');
  };

  return (
    <View>
      <View style={styles.tags}>
        {tags.map((tag) => (
          <Pressable
            key={tag}
            onPress={() => onChange(tags.filter((t) => t !== tag))}
            accessibilityRole="button"
            accessibilityLabel={`Remove tag ${tag}`}
            style={[pillStyles.shape, styles.tag]}
          >
            <Text variant="pill">{tag}</Text>
            <CloseIcon color={colors.secondary} size={detail.tagRemoveIcon} strokeWidth={size.iconStroke} />
          </Pressable>
        ))}
      </View>
      {full ? (
        <Text variant="secondary" color={colors.secondary} style={styles.limit}>
          That's {MAX_TAGS} tags, the most a save can have. Remove one to add another.
        </Text>
      ) : (
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          placeholder="Add a tag"
          placeholderTextColor={colors.secondary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          blurOnSubmit={false}
          maxLength={TAG_MAX_LENGTH}
          accessibilityLabel="Add a tag"
          style={styles.input}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: detail.tagGap },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: size.hairline,
    borderColor: colors.controlBorder,
    paddingHorizontal: sheet.pillPaddingX,
  },
  limit: { marginTop: spacing.sectionGap },
  input: {
    marginTop: spacing.sectionGap,
    height: size.fieldHeight,
    borderRadius: radius.button,
    borderWidth: size.hairline,
    borderColor: colors.controlBorder,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.fieldPaddingX,
    fontFamily: type.body.fontFamily,
    fontSize: type.body.fontSize,
    color: colors.ink,
  },
});
