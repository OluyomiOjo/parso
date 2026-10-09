import type { RefObject } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { CloseIcon } from '@/icons/CloseIcon';
import { SearchIcon } from '@/icons/SearchIcon';
import { colors, search, size, type } from '@/theme';

import { Text } from './Text';

const PLACEHOLDER = 'Search in your own words';

type InputProps = {
  value: string;
  onChangeText: (text: string) => void;
  inputRef?: RefObject<TextInput | null>;
  autoFocus?: boolean;
  onSubmit?: () => void;
};

// The Search tab's field: black outline, search icon, and a clear button once something is typed.
export function SearchField({ value, onChangeText, inputRef, autoFocus, onSubmit }: InputProps) {
  return (
    <View style={[styles.field, styles.focused]}>
      <SearchIcon color={colors.ink} size={search.icon} strokeWidth={size.iconStroke} />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={PLACEHOLDER}
        placeholderTextColor={colors.secondary}
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        clearButtonMode="never"
        accessibilityLabel="Search"
        style={styles.input}
      />
      {value ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={(size.minTouch - search.clearIcon) / 2}
        >
          <CloseIcon color={colors.secondary} size={search.clearIcon} strokeWidth={size.iconStroke} />
        </Pressable>
      ) : null}
    </View>
  );
}

// The same field on My Parsos, as a button that opens the Search tab.
export function SearchFieldButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="search" accessibilityLabel={PLACEHOLDER} style={styles.field}>
      <SearchIcon color={colors.secondary} size={search.icon} strokeWidth={size.iconStroke} />
      <Text variant="body" color={colors.secondary} numberOfLines={1}>
        {PLACEHOLDER}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    height: search.fieldHeight,
    borderRadius: search.fieldRadius,
    backgroundColor: colors.panel,
    paddingHorizontal: search.fieldPaddingX,
    flexDirection: 'row',
    alignItems: 'center',
    gap: search.iconGap,
  },
  focused: { borderWidth: search.fieldBorder, borderColor: colors.ink },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: type.body.fontFamily,
    fontSize: type.body.fontSize, // no lineHeight: it pushes single-line iOS text off centre
    color: colors.ink,
  },
});
