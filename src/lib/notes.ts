import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useSession } from './auth';
import {
  editorText,
  isEmptyNote,
  makeLine,
  NOTE_MAX,
  noteSnippet,
  noteTitle,
  parseNote,
  serializeNote,
  type NoteLine,
} from './noteFormat';
import { isLimitError } from './plan';
import { openUpgrade } from './pro';
import { LIST_COLUMNS, saveKey, savesKey, useSave, type SaveDetail, type SaveListItem } from './saves';
import { supabase } from './supabase';
import { track } from './track';

const NOTES_LIMIT = 200;
const AUTOSAVE_MS = 800;

// Opens a save where it belongs: notes in the editor, everything else on the detail page.
export function openSave(save: { id: string; kind: string }) {
  if (save.kind === 'text') router.push({ pathname: '/note/[id]', params: { id: save.id } });
  else router.push({ pathname: '/item/[id]', params: { id: save.id } });
}

// The Notes filter on Parsos: pinned first, then the most recently edited.
export function useNotes(enabled: boolean) {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: [...savesKey(userId), 'notes'],
    enabled: enabled && Boolean(userId),
    queryFn: async (): Promise<SaveListItem[]> => {
      const { data, error } = await supabase
        .from('saves')
        .select(LIST_COLUMNS)
        .eq('kind', 'text')
        .order('pinned', { ascending: false })
        .order('edited_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(NOTES_LIMIT);
      if (error) throw error;
      return data;
    },
  });
}

export function useTogglePin(id: string | null) {
  const queryClient = useQueryClient();
  const { session } = useSession();
  return useMutation({
    mutationFn: async (pinned: boolean) => {
      if (!id) return;
      const { error } = await supabase.from('saves').update({ pinned }).eq('id', id);
      if (error) throw error;
    },
    onMutate: (pinned) => {
      if (!id) return;
      queryClient.setQueryData<SaveDetail>(saveKey(id), (previous) => (previous ? { ...previous, pinned } : previous));
    },
    onSettled: () => {
      if (id) queryClient.invalidateQueries({ queryKey: saveKey(id) });
      queryClient.invalidateQueries({ queryKey: savesKey(session?.user.id) });
    },
  });
}

type Fields = { raw_text: string; title: string | null; snippet: string | null };

const fieldsFor = (lines: NoteLine[]): Fields => {
  const raw = serializeNote(lines).slice(0, NOTE_MAX);
  return { raw_text: raw, title: noteTitle(raw), snippet: noteSnippet(raw) };
};

export const NOTE_LIMIT = "You've used your 50 free saves. Upgrade to Parso Pro to keep this note.";
export const NOTE_SAVE_FAILED = "Couldn't save this note. Check your connection; Parso tries again as you type.";

// The editor's state and saving. A new note (id "new") is created on the first character typed, so empty notes
// are never kept; after that it saves itself shortly after typing stops, and again on leaving or when the app
// goes to the background. Leaving a note with nothing in it deletes it, as in Apple Notes.
export function useNoteEditor(routeId: string) {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;
  const isNew = routeId === 'new';
  const [lines, setLinesState] = useState<NoteLine[] | null>(isNew ? [makeLine()] : null);
  const [noteId, setNoteId] = useState<string | null>(isNew ? null : routeId);
  const { data: save, isError } = useSave(noteId ?? '', Boolean(noteId));
  const [error, setError] = useState<string | null>(null);
  const linesRef = useRef(lines);
  const idRef = useRef(noteId);
  const savedText = useRef<string | null>(null); // what the database has
  const queue = useRef<Promise<void>>(Promise.resolve()); // one write at a time, in order
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closed = useRef(false); // deleted, or left empty: nothing more is written
  const limitShown = useRef(false);

  // Loaded once; after that the screen's own lines are the truth (live updates would undo typing).
  useEffect(() => {
    if (!save || linesRef.current) return;
    const text = editorText(save.title, save.raw_text);
    const loaded = parseNote(text);
    linesRef.current = loaded;
    // The note as the editor shows it, so opening and leaving without typing never counts as an edit.
    savedText.current = fieldsFor(loaded).raw_text;
    setLinesState(loaded);
  }, [save]);

  const write = useCallback(() => {
    queue.current = queue.current.then(async () => {
      const current = linesRef.current;
      if (!current || closed.current || !userId) return;
      const fields = fieldsFor(current);
      if (fields.raw_text === savedText.current) return;
      const edited_at = new Date().toISOString(); // the database stamps its own time (migration 0018)
      if (!idRef.current) {
        if (isEmptyNote(current)) return;
        const { data, error: insertError } = await supabase
          .from('saves')
          .insert({ kind: 'text', source: 'other', ...fields, edited_at })
          .select('id')
          .single();
        if (isLimitError(insertError)) {
          if (!limitShown.current) openUpgrade(); // once; the note stays on screen and saves after upgrading
          limitShown.current = true;
          return setError(NOTE_LIMIT);
        }
        if (insertError || !data) return setError(NOTE_SAVE_FAILED);
        idRef.current = data.id;
        setNoteId(data.id);
        track('save_created', { kind: 'text', source: 'other', via: 'add' });
      } else {
        const { error: updateError } = await supabase
          .from('saves')
          .update({ ...fields, edited_at })
          .eq('id', idRef.current);
        if (updateError) return setError(NOTE_SAVE_FAILED);
        queryClient.setQueryData<SaveDetail>(saveKey(idRef.current), (previous) =>
          previous ? { ...previous, ...fields, edited_at } : previous,
        );
      }
      savedText.current = fields.raw_text;
      setError(null);
    });
    return queue.current;
  }, [queryClient, userId]);

  const setLines = useCallback(
    (next: NoteLine[]) => {
      linesRef.current = next;
      setLinesState(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(write, AUTOSAVE_MS);
    },
    [write],
  );

  // Leaving: write what's left, or delete a note that was emptied. Lists refresh either way.
  const finish = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    if (closed.current) return;
    const current = linesRef.current;
    if (current && isEmptyNote(current) && idRef.current) {
      closed.current = true;
      await queue.current;
      await supabase.from('saves').delete().eq('id', idRef.current);
      queryClient.removeQueries({ queryKey: saveKey(idRef.current) });
    } else {
      await write();
    }
    queryClient.invalidateQueries({ queryKey: savesKey(userId) });
    queryClient.invalidateQueries({ queryKey: ['collections', userId] });
    queryClient.invalidateQueries({ queryKey: ['search', userId] });
  }, [queryClient, userId, write]);

  // Delete note from the menu: the screen closes and nothing more is written.
  const markDeleted = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    closed.current = true;
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void write();
    });
    return () => {
      subscription.remove();
      void finish();
    };
  }, [finish, write]);

  return {
    save,
    loadFailed: isError,
    lines,
    setLines,
    noteId,
    error,
    text: () => (linesRef.current ? serializeNote(linesRef.current) : ''),
    flush: write,
    markDeleted,
  };
}
