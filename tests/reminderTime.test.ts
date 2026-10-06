// Run with: TZ=America/New_York npx -y deno@2.9.6 test --no-lock tests/ (times are local; TZ is pinned for repeatable results).
import { assertEquals } from 'jsr:@std/assert@1';

import { choiceFor, formatReminder, quickTimes, reminderTime, shortReminder } from '../src/lib/reminderTime.ts';

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

Deno.test('picker shortcuts: in an hour, this or tomorrow evening, tomorrow morning', () => {
  assertEquals(
    quickTimes(d(5, 14, 20)).map((q) => `${q.label} ${iso(q.when)}`),
    ['In 1 hour 10/5 15:20', 'This evening 10/5 18:00', 'Tomorrow morning 10/6 9:00'],
  );
  assertEquals(
    quickTimes(d(5, 19)).map((q) => `${q.label} ${iso(q.when)}`),
    ['In 1 hour 10/5 20:00', 'Tomorrow evening 10/6 18:00', 'Tomorrow morning 10/6 9:00'],
  );
  assertEquals(iso(quickTimes(d(31, 23, 30))[1].when), '11/1 18:00'); // end of month rolls over
});

Deno.test('detail label shows the date once a reminder is more than six days away', () => {
  assertEquals(shortReminder(d(10, 10), d(5, 9)), 'Sat, 10:00 AM');
  assertEquals(shortReminder(d(20, 15, 30), d(5, 9)), 'Tue, Oct 20, 3:30 PM');
});

Deno.test('a picked time shows as Pick, not as a fixed choice', () => {
  assertEquals(choiceFor(d(5, 20), d(5, 9)), 'tonight');
  assertEquals(choiceFor(d(9, 15, 30), d(5, 9)), 'custom');
  assertEquals(choiceFor(null, d(5, 9)), null);
});
