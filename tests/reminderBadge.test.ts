import { assertEquals } from 'jsr:@std/assert@1';

import { badgeLabel, dueSince } from '../src/lib/reminderBadge.ts';

const now = new Date('2026-10-10T12:00:00Z');
const seen = new Date('2026-10-10T09:00:00Z');

Deno.test('counts only reminders that went off after the page was last seen', () => {
  const times = [
    '2026-10-10T08:00:00Z', // before the last visit: already seen
    '2026-10-10T10:00:00Z', // went off since
    '2026-10-10T11:59:00Z', // went off since
    '2026-10-10T13:00:00Z', // still to come
  ];
  assertEquals(dueSince(times, seen, now), 2);
});

Deno.test('no label when nothing new, 9+ above nine', () => {
  assertEquals(badgeLabel(0), null);
  assertEquals(badgeLabel(3), '3');
  assertEquals(badgeLabel(9), '9');
  assertEquals(badgeLabel(12), '9+');
});
