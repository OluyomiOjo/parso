// Run with: TZ=America/New_York npx -y deno@2.9.6 test --no-lock tests/ (times are local; TZ is pinned for repeatable results).
import { assertEquals } from 'jsr:@std/assert@1';

import { formatReminder, reminderTime } from '../src/lib/reminderTime.ts';

// Oct 2026: Thu 1, Fri 2, Sat 3, Sun 4, Mon 5.
const d = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m);
const iso = (x: Date) =>
  `${x.getMonth() + 1}/${x.getDate()} ${x.getHours()}:${String(x.getMinutes()).padStart(2, '0')}`;

Deno.test('tonight is 8 PM, or an hour from now late in the evening', () => {
  assertEquals(iso(reminderTime('tonight', d(5, 9))), '10/5 20:00');
  assertEquals(iso(reminderTime('tonight', d(5, 19, 45))), '10/5 20:45');
  assertEquals(iso(reminderTime('tonight', d(5, 23, 10))), '10/6 0:10');
});

Deno.test('weekend is the next Saturday or Sunday 10 AM still ahead', () => {
  assertEquals(iso(reminderTime('weekend', d(5, 9))), '10/10 10:00'); // Monday → Saturday
  assertEquals(iso(reminderTime('weekend', d(2, 21))), '10/3 10:00'); // Friday night → Saturday
  assertEquals(iso(reminderTime('weekend', d(3, 9))), '10/3 10:00'); // Saturday 9 AM → today
  assertEquals(iso(reminderTime('weekend', d(3, 12))), '10/4 10:00'); // Saturday noon → Sunday
  assertEquals(iso(reminderTime('weekend', d(4, 22))), '10/10 10:00'); // Sunday night → next Saturday
});

Deno.test('next week is the coming Monday 9 AM', () => {
  assertEquals(iso(reminderTime('nextWeek', d(1, 15))), '10/5 9:00'); // Thursday
  assertEquals(iso(reminderTime('nextWeek', d(4, 22))), '10/5 9:00'); // Sunday night
  assertEquals(iso(reminderTime('nextWeek', d(5, 8))), '10/12 9:00'); // Monday → a week on
});

Deno.test('reminder labels', () => {
  const now = d(1, 15);
  assertEquals(formatReminder(d(1, 20), now), 'Tonight at 8:00 PM');
  assertEquals(formatReminder(d(2, 9), now), 'Tomorrow at 9:00 AM');
  assertEquals(formatReminder(d(3, 10), now), 'Sat at 10:00 AM');
  assertEquals(formatReminder(d(1, 14), now), 'Due now');
});
