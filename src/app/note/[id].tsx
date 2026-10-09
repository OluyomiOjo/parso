import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  InputAccessoryView,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/IconButton';
import { NoteLineInput } from '@/components/NoteLineInput';
import { Text } from '@/components/Text';
import { BellIcon } from '@/icons/BellIcon';
import { BulletIcon } from '@/icons/BulletIcon';
import { ChecklistIcon } from '@/icons/ChecklistIcon';
import { ChevronLeftIcon } from '@/icons/ChevronLeftIcon';
import { HideKeyboardIcon } from '@/icons/HideKeyboardIcon';
import { MoreIcon } from '@/icons/MoreIcon';
import { PinIcon } from '@/icons/PinIcon';
import { useSession } from '@/lib/auth';
import { relativeTime } from '@/lib/format';
import {
  backspaceAtStart,
  changeText,
  pressReturn,
  toggleChecked,
  toggleType,
  type Edit,
  type NoteLine,
} from '@/lib/noteFormat';
import { useNoteEditor, useTogglePin } from '@/lib/notes';
import { shortReminder } from '@/lib/reminderTime';
import { DELETE_FAILED, useDeleteSave, useMarkDone } from '@/lib/saves';
import { SHARE_FAILED, shareSave } from '@/lib/shareOut';
import { track } from '@/lib/track';
import { colors, note, size, spacing } from '@/theme';

const TOOLBAR = 'note-toolbar';
const FOCUS_DELAY_MS = 250; // after the screen slides in, so the keyboard doesn't fight the animation
const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

// A note, like Apple Notes: the first line is the title, lines can be checklist items or bullets, and it saves
// itself as you type. Opened from + then Note (id "new"), and from any note in Parso.
export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const editor = useNoteEditor(id);
  const { lines, setLines, noteId, save } = editor;
  const togglePin = useTogglePin(noteId);
  const deleteSave = useDeleteSave(noteId ? { id: noteId, kind: 'text', thumbnail_path: null } : undefined);
  const markDone = useMarkDone(noteId ?? '');

  const inputs = useRef(new Map<string, TextInput>());
  const focused = useRef(0); // index of the line with the cursor
  const cursor = useRef(0);
  const pendingFocus = useRef<{ key: string; at: number } | null>(null);
  const [keyboardUp, setKeyboardUp] = useState(false);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardWillShow', () => setKeyboardUp(true));
    const hidden = Keyboard.addListener('keyboardWillHide', () => setKeyboardUp(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  // After Return, Backspace or a paste, the cursor moves to the line the edit says.
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const input = inputs.current.get(target.key);
    input?.focus();
    input?.setSelection(target.at, target.at);
  }, [lines]);

  // One "save opened" per visit to an existing note (never its content).
  useEffect(() => {
    if (id !== 'new') track('save_opened', { kind: 'text', source: 'other' });
  }, [id]);

  // A new note opens with the keyboard up.
  const isNew = id === 'new';
  const firstKey = lines?.[0]?.key;
  useEffect(() => {
    if (isNew && firstKey) setTimeout(() => inputs.current.get(firstKey)?.focus(), FOCUS_DELAY_MS);
  }, [isNew, firstKey]);

  if (!lines) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + note.headerTop }]}>
        <View style={styles.header}>
          <IconButton label="Back" onPress={goBack}>
            <ChevronLeftIcon color={colors.ink} size={size.iconButtonIcon} strokeWidth={size.iconStroke} />
          </IconButton>
        </View>
        {editor.loadFailed ? (
          <Text variant="secondary" color={colors.secondary} style={styles.message}>
            Couldn't load this note. It may have been deleted. Go back and pull down to refresh.
          </Text>
        ) : (
          <ActivityIndicator style={styles.message} color={colors.secondary} />
        )}
      </View>
    );
  }

  const apply = (edit: Edit) => {
    pendingFocus.current = { key: edit.lines[edit.focus].key, at: edit.cursor };
    focused.current = edit.focus;
    setLines(edit.lines);
  };
  const update = (next: NoteLine[]) => setLines(next);

  const toggle = (kind: 'check' | 'bullet') => {
    const index = Math.min(focused.current, lines.length - 1);
    update(toggleType(lines, index, kind));
  };

  const focusEnd = () => {
    const last = lines[lines.length - 1];
    const input = inputs.current.get(last.key);
    input?.focus();
    input?.setSelection(last.text.length, last.text.length);
  };

  const remind = () => {
    if (!noteId) return;
    Keyboard.dismiss();
    router.push({ pathname: '/item-edit/[id]', params: { id: noteId, field: 'reminder' } });
  };

  const edit = (field: 'collection' | 'tags') => {
    if (!noteId) return;
    Keyboard.dismiss();
    router.push({ pathname: '/item-edit/[id]', params: { id: noteId, field } });
  };

  const share = async () => {
    if (!noteId || !session) return;
    await editor.flush();
    const raw = editor.text();
    shareSave(
      { id: noteId, kind: 'text', title: null, url: null, raw_text: raw, thumbnail_path: null },
      session.user.id,
    ).catch(() => Alert.alert(SHARE_FAILED));
  };

  const confirmDelete = () =>
    Alert.alert('Delete this note?', "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          editor.markDeleted();
          deleteSave.mutate(undefined, { onSuccess: goBack, onError: () => Alert.alert(DELETE_FAILED) });
        },
      },
    ]);

  const more = () => {
    const done = Boolean(save?.done_at);
    const options = [
      'Collection',
      'Tags',
      'Remind me',
      done ? 'Mark as not done' : 'Mark as done',
      'Share',
      'Delete note',
      'Cancel',
    ];
    Keyboard.dismiss();
    ActionSheetIOS.showActionSheetWithOptions({ options, destructiveButtonIndex: 5, cancelButtonIndex: 6 }, (index) => {
      if (index === 0) edit('collection');
      else if (index === 1) edit('tags');
      else if (index === 2) remind();
      else if (index === 3) markDone.mutate(!done, { onError: (error) => Alert.alert(error.message) });
      else if (index === 4) void share();
      else if (index === 5) confirmDelete();
    });
  };

  const pinned = save?.pinned ?? false;
  const edited = save?.edited_at ?? save?.created_at;
  const reminder = save?.reminder_at && new Date(save.reminder_at) > new Date() ? new Date(save.reminder_at) : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + note.headerTop }]}>
      <View style={styles.header}>
        <IconButton label="Back" onPress={goBack}>
          <ChevronLeftIcon color={colors.ink} size={size.iconButtonIcon} strokeWidth={size.iconStroke} />
        </IconButton>
        <View style={styles.headerActions}>
          {noteId ? (
            <>
              <IconButton label={pinned ? 'Unpin note' : 'Pin note'} onPress={() => togglePin.mutate(!pinned)}>
                <PinIcon color={colors.ink} size={size.iconButtonIcon} strokeWidth={size.iconStroke} filled={pinned} />
              </IconButton>
              <IconButton label="More" onPress={more}>
                <MoreIcon color={colors.ink} size={size.iconButtonIcon} strokeWidth={size.iconStroke} />
              </IconButton>
            </>
          ) : null}
          {keyboardUp ? (
            <Pressable onPress={goBack} accessibilityRole="button" hitSlop={spacing.sm} style={styles.done}>
              <Text variant="button">Done</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.page}
        contentContainerStyle={{ paddingBottom: insets.bottom + note.bottomSpace }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metaRow}>
          <Text variant="meta" color={colors.secondary}>
            {edited && noteId ? `Edited ${relativeTime(edited)}` : 'New note'}
          </Text>
          {reminder ? (
            <Pressable onPress={remind} accessibilityRole="button" hitSlop={spacing.sm} style={styles.reminder}>
              <BellIcon color={colors.secondary} size={size.sourceIcon} strokeWidth={size.iconStroke} />
              <Text variant="meta" color={colors.secondary}>
                {shortReminder(reminder)}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {editor.error ? (
          <Text variant="secondary" style={styles.error} accessibilityLiveRegion="polite">
            {editor.error}
          </Text>
        ) : null}

        <View style={styles.lines}>
          {lines.map((line, index) => (
            <NoteLineInput
              key={line.key}
              ref={(input) => {
                if (input) inputs.current.set(line.key, input);
                else inputs.current.delete(line.key);
              }}
              line={line}
              isTitle={index === 0}
              placeholder={index === 0 && lines.length === 1 ? 'Title' : undefined}
              accessoryId={TOOLBAR}
              onFocus={() => {
                focused.current = index;
              }}
              onSelection={(start) => {
                cursor.current = start;
              }}
              onChangeText={(text) => {
                const result = changeText(lines, index, text);
                if (result.lines.length !== lines.length) apply(result);
                else update(result.lines);
              }}
              onReturn={() => apply(pressReturn(lines, index, cursor.current))}
              onBackspaceAtStart={() => {
                const result = backspaceAtStart(lines, index);
                if (result) apply(result);
              }}
              onToggleChecked={() => update(toggleChecked(lines, index))}
            />
          ))}
        </View>
        {/* The empty page under the last line: a tap there puts the cursor at the end, as in Apple Notes. */}
        <Pressable onPress={focusEnd} accessible={false} style={{ height: note.bottomSpace }} />
      </ScrollView>

      <InputAccessoryView nativeID={TOOLBAR} backgroundColor={colors.panel}>
        <View style={styles.toolbar}>
          <ToolbarButton label="Checklist" onPress={() => toggle('check')}>
            <ChecklistIcon color={colors.ink} size={note.toolbarIcon} strokeWidth={size.iconStroke} />
          </ToolbarButton>
          <ToolbarButton label="Bullet" onPress={() => toggle('bullet')}>
            <BulletIcon color={colors.ink} size={note.toolbarIcon} strokeWidth={size.iconStroke} />
          </ToolbarButton>
          <ToolbarButton label="Remind me" onPress={remind} disabled={!noteId}>
            <BellIcon
              color={noteId ? colors.ink : colors.controlBorder}
              size={note.toolbarIcon}
              strokeWidth={size.iconStroke}
            />
          </ToolbarButton>
          <View style={styles.toolbarSpacer} />
          <ToolbarButton label="Hide keyboard" onPress={Keyboard.dismiss}>
            <HideKeyboardIcon color={colors.ink} size={note.toolbarIcon} strokeWidth={size.iconStroke} />
          </ToolbarButton>
        </View>
      </InputAccessoryView>
    </View>
  );
}

function ToolbarButton({
  label,
  onPress,
  disabled = false,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.toolbarButton, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screen,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: note.headerGap },
  done: { minHeight: size.minTouch, justifyContent: 'center', paddingLeft: spacing.sm },
  page: { flex: 1, paddingHorizontal: note.paddingX },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: note.metaTop },
  reminder: { flexDirection: 'row', alignItems: 'center', gap: note.reminderGap },
  error: { marginTop: spacing.errorTop },
  lines: { marginTop: note.titleTop },
  message: { marginTop: spacing.sectionGapLarge, paddingHorizontal: spacing.screen },
  toolbar: {
    height: note.toolbarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: note.toolbarGap,
    paddingHorizontal: note.paddingX,
    borderTopWidth: size.hairline,
    borderTopColor: colors.divider,
  },
  toolbarButton: { minWidth: size.minTouch, height: size.minTouch, alignItems: 'center', justifyContent: 'center' },
  toolbarSpacer: { flex: 1 },
  pressed: { opacity: 0.6 },
});
