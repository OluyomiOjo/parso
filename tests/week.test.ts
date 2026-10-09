// Run with: TZ=America/New_York npx -y deno@2.9.6 test --no-lock tests/
import { assertEquals } from 'jsr:@std/assert@1';

import {
  doneLabel,
  lastWeekEnd,
  mostCommon,
  mostSavedLine,
  nextWeekEnd,
  pastIndex,
  rangeLabel,
  savesToAsk,
  showWeekCard,
  weekNotificationBody,
  weekRange,
} from '../src/lib/week.ts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Local times (the tests run in New York time). Oct 11 2026 is a Sunday.
const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute);

Deno.test('a week ends on Sunday at 6 PM', () => {
  assertEquals(lastWeekEnd(at(11, 18)), at(11, 18));
  assertEquals(lastWeekEnd(at(11, 17, 59)), at(4, 18));
  assertEquals(lastWeekEnd(at(14, 9)), at(11, 18));
  assertEquals(nextWeekEnd(at(11, 18)), at(18, 18));
  assertEquals(nextWeekEnd(at(9, 12)), at(11, 18));
});

Deno.test('Sunday evening to Wednesday shows the finished week; later, the week so far', () => {
  assertEquals(weekRange(at(11, 19)), { start: at(4, 18), end: at(11, 18), ready: true });
  assertEquals(weekRange(at(14, 23, 59)).ready, true);
  assertEquals(weekRange(at(15, 0, 1)), { start: at(11, 18), end: at(15, 0, 1), ready: false });
  assertEquals(rangeLabel(weekRange(at(12, 9)), MONTHS), 'Oct 4 to Oct 11');
  assertEquals(rangeLabel(weekRange(at(16, 9)), MONTHS), 'This week so far, since Oct 11');
});

Deno.test('the daylight saving change keeps Sunday 6 PM', () => {
  // US clocks go back on Nov 1 2026.
  assertEquals(lastWeekEnd(new Date(2026, 10, 3, 9)), new Date(2026, 10, 1, 18));
  assertEquals(nextWeekEnd(new Date(2026, 9, 30, 9)), new Date(2026, 10, 1, 18));
});

Deno.test('the card shows until the finished week is opened', () => {
  assertEquals(showWeekCard(at(11, 19), null), true);
  assertEquals(showWeekCard(at(11, 19), at(10, 9)), true);
  assertEquals(showWeekCard(at(12, 9), at(11, 20)), false);
  assertEquals(showWeekCard(at(15, 9), null), false);
});

Deno.test('asks about recent saves that are not done, newest first, up to five', () => {
  const now = at(11, 19);
  const save = (day: number, extra: Partial<{ done_at: string | null }> = {}) => ({
    created_at: new Date(2026, 9, day, 12).toISOString(),
    done_at: null as string | null,
    ...extra,
  });
  const picked = savesToAsk([save(1), save(10), save(9, { done_at: 'x' }), save(7), save(6), save(5), save(4)], now);
  assertEquals(
    picked.map((s) => new Date(s.created_at).getDate()),
    [10, 7, 6, 5, 4],
  );
  assertEquals(savesToAsk([{ ...save(1), created_at: new Date(2026, 7, 1).toISOString() }], now), []);
});

Deno.test('the past pick stays the same all week and moves the next', () => {
  assertEquals(pastIndex(at(11, 18), 0), -1);
  assertEquals(pastIndex(at(11, 18), 40), pastIndex(at(11, 18), 40));
  const a = pastIndex(at(11, 18), 40);
  const b = pastIndex(at(18, 18), 40);
  assertEquals(a >= 0 && a < 40 && b >= 0 && b < 40, true);
  assertEquals(a === b, false);
});

Deno.test('numbers and words', () => {
  assertEquals(mostCommon(['a', 'b', null, 'b']), 'b');
  assertEquals(mostCommon([]), null);
  assertEquals(mostSavedLine('Recipes', 'Instagram'), 'Recipes, from Instagram');
  assertEquals(mostSavedLine(null, 'TikTok'), 'From TikTok');
  assertEquals(mostSavedLine(null, null), null);
  assertEquals(weekNotificationBody(12, 3), '12 saves this week. 3 are waiting on you.');
  assertEquals(weekNotificationBody(1, 1), '1 save this week. 1 is waiting on you.');
  assertEquals(weekNotificationBody(4, 0), '4 saves this week.');
  assertEquals(weekNotificationBody(0, 2), 'Nothing new this week. 2 are waiting on you.');
  assertEquals(weekNotificationBody(0, 0), 'Nothing new this week. See what you saved before.');
  assertEquals(doneLabel(new Date(2026, 9, 12, 9).toISOString(), MONTHS), 'Done on Oct 12');
});
