// The rules of the offline queue (src/lib/outbox.ts), as pure functions so they can be tested on their own
// (tests/outboxQueue.test.ts).
import { MONTHS } from './format';
import { displayUrl } from './links';
import { noteTitle } from './noteFormat';
import { clockTime } from './reminderTime';

// What a waiting save will write: a new row (links, shared text, a new note), or the latest text of a note.
export type QueuedRow = {
  kind?: 'link' | 'text';
  source?: string;
  url?: string | null;
  raw_text?: string | null;
  preview_image_url?: string | null;
  title?: string | null;
  snippet?: string | null;
  edited_at?: string | null;
};

export type Via = 'share' | 'clipboard' | 'add';

export type OutboxEntry = {
  id: string; // the save's own id, made on the phone, so sending twice can never save twice
  op: 'insert' | 'update';
  row: QueuedRow;
  via: Via;
  queuedAt: string;
  rev: number; // goes up with every change, so an edit made while sending is never lost
};

export type NewEntry = Omit<OutboxEntry, 'rev'>;

// Adds a waiting save, or folds a newer version into one already waiting (a note typed into offline). A row
// still waiting to be created stays a create, now with the newest text.
export function putEntry(entries: OutboxEntry[], next: NewEntry): OutboxEntry[] {
  const current = entries.find((e) => e.id === next.id);
  if (!current) return [...entries, { ...next, rev: 1 }];
  return entries.map((e) =>
    e.id === next.id
      ? { ...e, op: e.op === 'insert' ? 'insert' : next.op, row: { ...e.row, ...next.row }, rev: e.rev + 1 }
      : e,
  );
}

// After a waiting save was sent as it was at `rev`: gone from the queue, unless it changed meanwhile. Then the
// newer text stays queued, as a change to the row that now exists.
export function settleEntry(entries: OutboxEntry[], id: string, rev: number): OutboxEntry[] {
  return entries.flatMap((e) => {
    if (e.id !== id) return [e];
    return e.rev === rev ? [] : [{ ...e, op: 'update' as const }];
  });
}

export const dropEntry = (entries: OutboxEntry[], id: string) => entries.filter((e) => e.id !== id);

export const queuedLink = (entries: OutboxEntry[], url: string) =>
  entries.find((e) => e.op === 'insert' && e.row.url === url);

// The title a waiting save shows: a note's first line, the link's address, or the shared text's first line.
export function waitingTitle(row: QueuedRow): string {
  if (row.title) return row.title;
  if (row.url) return displayUrl(row.url);
  return (row.raw_text && noteTitle(row.raw_text)) || 'Note';
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// The slim line shown while offline: "You're offline. Showing your Parsos from 2:14 PM." (or yesterday, or a
// date), or, with nothing on the phone yet, what will happen.
export function offlineLine(updatedAt: number | null | undefined, now: Date = new Date()): string {
  if (!updatedAt) return "You're offline. Your Parsos show here once you're back online.";
  const then = new Date(updatedAt);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const when = sameDay(then, now)
    ? clockTime(then)
    : sameDay(then, yesterday)
      ? `yesterday, ${clockTime(then)}`
      : `${MONTHS[then.getMonth()]} ${then.getDate()}`;
  return `You're offline. Showing your Parsos from ${when}.`;
}
