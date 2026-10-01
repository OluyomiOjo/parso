import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { CloseIcon } from '@/icons/CloseIcon';
import { colors, detail, radius, sheet, size, spacing, type } from '@/theme';

import { pillStyles } from './Pill';
import { Text } from './Text';

export const MAX_TAGS = 10;
const TAG_MAX_LENGTH = 30;

// Adds the typed tag (lowercase, single spaces) unless it's empty, already there, or over the limit.
export function withTag(tags: string[], draft: string): string[] {
  const tag = draft.trim().toLowerCase().replace(/\s+/g, ' ');
  return tag && !tags.includes(tag) && tags.length < MAX_TAGS ? [...tags, tag] : tags;
}

type Props = {
  tags: string[];
  onChange: (tags: string[]) => void;
  draft: string; // kept by the sheet, so Save also adds a tag that was typed but not yet added
  onDraftChange: (draft: string) => void;
};

// Tags as pills with an ×, then a field to add one. Tags are kept lowercase, like the AI writes them.
export function TagEditor({ tags, onChange, draft, onDraftChange }: Props) {
  const full = tags.length >= MAX_TAGS;

  const add = () => {
    onChange(withTag(tags, draft));
    onDraftChange('');
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
          onChangeText={onDraftChange}
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
