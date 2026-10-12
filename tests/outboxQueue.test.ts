import { assertEquals } from 'jsr:@std/assert@1';

import { type NewEntry, offlineLine, putEntry, queuedLink, settleEntry, waitingTitle } from '../src/lib/outboxQueue.ts';

const link: NewEntry = {
  id: 'a',
  op: 'insert',
  row: { kind: 'link', source: 'instagram', url: 'https://www.instagram.com/p/x/' },
  via: 'share',
  queuedAt: '2026-10-12T10:00:00Z',
};
const note: NewEntry = {
  id: 'n',
  op: 'insert',
  row: { kind: 'text', source: 'other', raw_text: 'Pasta\n- [ ] basil', title: 'Pasta' },
  via: 'add',
  queuedAt: '2026-10-12T10:00:00Z',
};

Deno.test('a note typed into offline stays one new note with the newest text', () => {
  let queue = putEntry([], note);
  queue = putEntry(queue, { ...note, op: 'update', row: { raw_text: 'Pasta\n- [x] basil', title: 'Pasta' } });
  assertEquals(queue.length, 1);
  assertEquals(queue[0].op, 'insert');
  assertEquals(queue[0].row.kind, 'text');
  assertEquals(queue[0].row.raw_text, 'Pasta\n- [x] basil');
  assertEquals(queue[0].rev, 2);
});

Deno.test('sent unchanged: gone; changed while sending: kept as a change to the new row', () => {
  const queue = putEntry(putEntry([], link), note);
  assertEquals(
    settleEntry(queue, 'a', 1).map((e) => e.id),
    ['n'],
  );
  const edited = putEntry(queue, { ...note, op: 'update', row: { raw_text: 'Pasta\nmore' } });
  const after = settleEntry(edited, 'n', 1);
  assertEquals(after.length, 2);
  assertEquals(after[1].op, 'update');
  assertEquals(after[1].row.raw_text, 'Pasta\nmore');
});

Deno.test('the same link is only queued once', () => {
  const queue = putEntry([], link);
  assertEquals(queuedLink(queue, 'https://www.instagram.com/p/x/')?.id, 'a');
  assertEquals(queuedLink(queue, 'https://example.com/'), undefined);
});

Deno.test('waiting rows show a title, the link, or the first line', () => {
  assertEquals(waitingTitle({ title: 'Pasta' }), 'Pasta');
  assertEquals(waitingTitle({ url: 'https://www.example.com/recipe/' }), 'example.com/recipe');
  assertEquals(waitingTitle({ raw_text: '\nCall Ade about the flat\nTuesday' }), 'Call Ade about the flat');
});

Deno.test('the offline line says when the list was last loaded', () => {
  const now = new Date(2026, 9, 12, 16, 0);
  assertEquals(
    offlineLine(new Date(2026, 9, 12, 14, 14).getTime(), now),
    "You're offline. Showing your Parsos from 2:14 PM.",
  );
  assertEquals(
    offlineLine(new Date(2026, 9, 11, 21, 5).getTime(), now),
    "You're offline. Showing your Parsos from yesterday, 9:05 PM.",
  );
  assertEquals(
    offlineLine(new Date(2026, 9, 3, 9, 0).getTime(), now),
    "You're offline. Showing your Parsos from Oct 3.",
  );
  assertEquals(offlineLine(null, now), "You're offline. Your Parsos show here once you're back online.");
});
