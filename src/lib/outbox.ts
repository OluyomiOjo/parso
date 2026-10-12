import AsyncStorage from '@react-native-async-storage/async-storage';
import { onlineManager } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useEffect, useSyncExternalStore } from 'react';
import { Alert, AppState } from 'react-native';

import { useSession } from './auth';
import { isOnline } from './connection';
import type { TablesInsert } from './database.types';
import { noteSnippet } from './noteFormat';
import {
  dropEntry,
  type NewEntry,
  type OutboxEntry,
  putEntry,
  type QueuedRow,
  queuedLink,
  settleEntry,
  type Via,
  waitingTitle,
} from './outboxQueue';
import { isLimitError } from './plan';
import { addPreviewImage } from './previewImage';
import { openUpgrade } from './pro';
import { queryClient } from './queryClient';
import type { SaveListItem } from './saves';
import { supabase } from './supabase';
import { track } from './track';

// Saves made with no internet (links, shared text, notes) wait here, on the phone, and are sent as soon as Parso
// can reach its server again; the AI files them then. Each waiting save already has its own id, so sending it
// twice (an answer lost on a bad connection) never saves it twice. Photos and screenshots aren't queued: they
// say so and are saved again later (owner decision, offline step).
let owner: string | null = null;
let entries: OutboxEntry[] = [];
const listeners = new Set<() => void>();
let chain: Promise<void> = Promise.resolve(); // one change at a time, in order

const storageKey = (userId: string) => `parso.outbox.${userId}`;

// Loads the person's queue (each account has its own), then applies the change and keeps it on the phone.
function change(userId: string, apply: (current: OutboxEntry[]) => OutboxEntry[]): Promise<void> {
  chain = chain.then(async () => {
    if (owner !== userId) {
      owner = userId;
      try {
        entries = JSON.parse((await AsyncStorage.getItem(storageKey(userId))) ?? '[]') as OutboxEntry[];
      } catch {
        entries = [];
      }
    }
    const next = apply(entries);
    if (next !== entries) {
      entries = next;
      await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next)).catch(() => undefined);
    }
    listeners.forEach((listener) => listener());
  });
  return chain;
}

const read = (userId: string) => change(userId, (current) => current);

export const queuedEntry = (id: string) => entries.find((e) => e.id === id);

export function queueSave(userId: string, entry: NewEntry) {
  return change(userId, (current) => putEntry(current, entry));
}

export function unqueue(userId: string, id: string) {
  return change(userId, (current) => dropEntry(current, id));
}

export const ALREADY_SAVED = 'This link is already in Parsos.';

// A link already in the lists the phone has kept.
function keptLink(userId: string, url: string): boolean {
  return queryClient
    .getQueriesData<unknown>({ queryKey: ['saves', userId] })
    .some(([, data]) => Array.isArray(data) && data.some((save: { url?: string | null }) => save.url === url));
}

// Queues a new link or shared text. Returns the waiting save's id (the same one for a link already waiting), or
// alreadySaved for a link the phone knows is saved.
export async function queueNewSave(
  userId: string,
  row: QueuedRow,
  via: Via,
): Promise<{ id: string } | { alreadySaved: true }> {
  await read(userId);
  if (row.url) {
    if (keptLink(userId, row.url)) return { alreadySaved: true };
    const waiting = queuedLink(entries, row.url);
    if (waiting) return { id: waiting.id };
  }
  const id = Crypto.randomUUID();
  await queueSave(userId, { id, op: 'insert', row, via, queuedAt: new Date().toISOString() });
  return { id };
}

type Outcome = 'sent' | 'offline' | 'limit' | 'failed';

async function send(entry: OutboxEntry): Promise<Outcome> {
  const lost = (): Outcome => (isOnline() ? 'failed' : 'offline');
  if (entry.op === 'update') {
    const { error } = await supabase.from('saves').update(entry.row).eq('id', entry.id);
    return error ? lost() : 'sent';
  }
  // Saved meanwhile (from another phone, or this one's earlier try): nothing more to do.
  if (entry.row.url) {
    const { data, error } = await supabase.from('saves').select('id').eq('url', entry.row.url).limit(1);
    if (error) return lost();
    if (data[0]) return 'sent';
  }
  const { error } = await supabase.from('saves').insert({ id: entry.id, ...entry.row } as TablesInsert<'saves'>);
  if (error?.code === '23505') return 'sent'; // the earlier try got through; only its answer was lost
  if (isLimitError(error)) return 'limit';
  if (error) return lost();
  const { kind = 'text', source = 'other', url = null } = entry.row;
  track('save_created', { kind, source, via: entry.via });
  if (url && !entry.row.preview_image_url) void addPreviewImage({ id: entry.id, kind, source, url });
  return 'sent';
}

const MAX_TRIES = 3; // a save the server keeps refusing (not for the connection) is dropped after this
const tries = new Map<string, number>();
let sending = false;

// Sends everything waiting, oldest first, and stops at the first sign of being offline again.
export async function sendQueued(): Promise<void> {
  const userId = owner;
  if (sending || !userId || !isOnline()) return;
  sending = true;
  const limited: OutboxEntry[] = [];
  let sent = 0;
  try {
    for (const entry of [...entries]) {
      const outcome = await send(entry);
      if (outcome === 'offline') break;
      if (outcome === 'failed') {
        const count = (tries.get(entry.id) ?? 0) + 1;
        tries.set(entry.id, count);
        if (count >= MAX_TRIES) await unqueue(userId, entry.id);
        continue;
      }
      if (outcome === 'limit') {
        limited.push(entry);
        await unqueue(userId, entry.id);
        continue;
      }
      sent++;
      await change(userId, (current) => settleEntry(current, entry.id, entry.rev));
    }
  } finally {
    sending = false;
  }
  if (sent) {
    void queryClient.invalidateQueries({ queryKey: ['saves', userId] });
    void queryClient.invalidateQueries({ queryKey: ['collections', userId] });
    void queryClient.invalidateQueries({ queryKey: ['search', userId] });
    // A note typed into while it was being sent is still waiting, now as a change: send that too.
    if (entries.length && isOnline()) void sendQueued();
  }
  if (limited.length) offerUpgrade(userId, limited);
}

// The free limit was reached while offline: the waiting saves are kept only after upgrading.
function offerUpgrade(userId: string, limited: OutboxEntry[]) {
  const what = limited.length === 1 ? 'The save you made offline' : `${limited.length} saves you made offline`;
  Alert.alert(`${what} couldn't be added`, "You've used your 50 free saves. Upgrade to Parso Pro to keep saving.", [
    { text: 'Not now', style: 'cancel' },
    {
      text: 'See Parso Pro',
      onPress: () =>
        openUpgrade(() => {
          void Promise.all(limited.map(({ rev: _rev, ...entry }) => queueSave(userId, entry))).then(sendQueued);
        }),
    },
  ]);
}

// The saves still waiting to be created, for the "Waiting to save" rows on Parsos.
export function useWaitingSaves(): OutboxEntry[] {
  const all = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => entries,
  );
  return all.filter((e) => e.op === 'insert');
}

// At the app's root: loads the person's queue and sends it at launch, when the connection comes back, and
// whenever Parso returns to the front.
export function useOutboxSync() {
  const { session } = useSession();
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    void read(userId).then(sendQueued);
    const offOnline = onlineManager.subscribe((online) => online && void sendQueued());
    const offState = AppState.addEventListener('change', (state) => state === 'active' && void sendQueued());
    return () => {
      offOnline();
      offState.remove();
    };
  }, [userId]);
}

// A waiting save as a list row, for Parsos and the save sheet. It reads as filed (processed_at) so no picture
// is waited for while offline.
export function waitingItem(entry: OutboxEntry): SaveListItem {
  const { kind = 'text', source = 'other', url = null, raw_text = null, edited_at = null } = entry.row;
  return {
    id: entry.id,
    kind,
    source,
    url,
    title: waitingTitle(entry.row),
    snippet: kind === 'text' && raw_text ? (noteSnippet(raw_text) ?? null) : null,
    thumbnail_path: null,
    thumbnail_width: null,
    thumbnail_height: null,
    author_handle: null,
    created_at: entry.queuedAt,
    processed_at: entry.queuedAt,
    pinned: false,
    edited_at,
    done_at: null,
  };
}
