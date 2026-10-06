import { forwardRef, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
  type TextInputSelectionChangeEventData,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { NoteLine } from '@/lib/noteFormat';
import { colors, note, type } from '@/theme';

type Props = {
  line: NoteLine;
  isTitle: boolean;
  placeholder?: string;
  accessoryId: string;
  onChangeText: (text: string) => void;
  onReturn: () => void;
  onBackspaceAtStart: () => void;
  onSelection: (start: number, end: number) => void;
  onFocus: () => void;
  onToggleChecked: () => void;
};

// One line of a note: its own native text box, with a tick box or bullet beside it when it's a list item.
// Return and Backspace at the start are handled by the editor, so lists continue and end like Apple Notes.
export const NoteLineInput = forwardRef<TextInput, Props>(function NoteLineInput(
  {
    line,
    isTitle,
    placeholder,
    accessoryId,
    onChangeText,
    onReturn,
    onBackspaceAtStart,
    onSelection,
    onFocus,
    onToggleChecked,
  },
  ref,
) {
  const selection = useRef({ start: 0, end: 0 });
  const done = line.type === 'check' && line.checked;

  return (
    <View style={styles.row}>
      {line.type === 'check' ? (
        <Pressable
          onPress={onToggleChecked}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: line.checked }}
          accessibilityLabel={line.text || 'Checklist item'}
          hitSlop={note.checkGap}
          style={styles.marker}
        >
          <View style={[styles.check, line.checked && styles.checked]}>
            {line.checked ? (
              <Svg width={note.checkTick} height={note.checkTick} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  stroke={colors.onInk}
                  strokeWidth={note.checkTickStroke}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            ) : null}
          </View>
        </Pressable>
      ) : line.type === 'bullet' ? (
        <View style={styles.marker}>
          <View style={styles.bullet} />
        </View>
      ) : null}
      <TextInput
        ref={ref}
        value={line.text}
        onChangeText={onChangeText}
        onSubmitEditing={onReturn}
        submitBehavior="submit"
        multiline
        scrollEnabled={false}
        onSelectionChange={(e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
          selection.current = e.nativeEvent.selection;
          onSelection(selection.current.start, selection.current.end);
        }}
        onKeyPress={(e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
          if (e.nativeEvent.key === 'Backspace' && selection.current.start === 0 && selection.current.end === 0)
            onBackspaceAtStart();
        }}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor={colors.secondary}
        inputAccessoryViewID={accessoryId}
        accessibilityLabel={isTitle ? 'Title' : undefined}
        style={[styles.input, isTitle ? styles.title : styles.body, done && styles.done]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', marginTop: note.lineGap },
  marker: {
    width: note.markerSlot,
    height: type.body.lineHeight,
    marginRight: note.checkGap,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: note.check,
    height: note.check,
    borderRadius: note.check / 2,
    borderWidth: note.checkBorder,
    borderColor: colors.controlBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.ink, borderColor: colors.ink },
  bullet: { width: note.bullet, height: note.bullet, borderRadius: note.bullet / 2, backgroundColor: colors.ink },
  input: { flex: 1, padding: 0, color: colors.ink },
  title: { ...type.detailTitle },
  body: { ...type.body },
  done: { color: colors.secondary, textDecorationLine: 'line-through' },
});
