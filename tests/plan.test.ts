// Run with: npx -y deno@2.9.6 test --no-lock tests/
import { assertEquals } from 'jsr:@std/assert@1';

import {
  freeSavesLeft,
  isLimitError,
  needsUpgrade,
  percentSaved,
  planLine,
  proLine,
  type Plan,
} from '../src/lib/plan.ts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const free = (used: number): Plan => ({ pro: false, used, proUntil: null, adminPro: false });

Deno.test('the 51st save asks to upgrade; Pro never does', () => {
  assertEquals(needsUpgrade(free(49)), false);
  assertEquals(needsUpgrade(free(50)), true);
  assertEquals(needsUpgrade({ ...free(120), pro: true }), false);
  assertEquals(needsUpgrade(undefined), false); // not loaded yet: the server still enforces the limit
});

Deno.test('the save sheet counts down from 40', () => {
  assertEquals(freeSavesLeft(free(39)), null);
  assertEquals(freeSavesLeft(free(40)), '10 free saves left');
  assertEquals(freeSavesLeft(free(45)), '5 free saves left');
  assertEquals(freeSavesLeft(free(49)), '1 free save left');
  assertEquals(freeSavesLeft(free(50)), 'That was your last free save.');
  assertEquals(freeSavesLeft({ ...free(48), pro: true }), null);
});

Deno.test('the You tab line', () => {
  assertEquals(planLine(free(32), MONTHS), '32 of 50 free saves used');
  assertEquals(planLine(free(70), MONTHS), '50 of 50 free saves used');
  assertEquals(
    planLine({ pro: true, used: 70, proUntil: '2026-11-08T12:00:00Z', adminPro: false }, MONTHS),
    'Parso Pro, renews Nov 8',
  );
  assertEquals(planLine({ pro: true, used: 70, proUntil: null, adminPro: true }, MONTHS), 'Parso Pro');
});

Deno.test('the database refusal is recognised', () => {
  assertEquals(isLimitError({ code: 'P0001', message: 'save_limit_reached' }), true);
  assertEquals(isLimitError({ message: 'network down' }), false);
  assertEquals(isLimitError(null), false);
});

Deno.test('Yearly shows the saving against twelve months, rounded down', () => {
  assertEquals(percentSaved(4.99, 39.99), 33);
  assertEquals(percentSaved(4.99, 59.88), null); // no saving
  assertEquals(percentSaved(undefined, 39.99), null);
  assertEquals(percentSaved(4.99, undefined), null);
});

Deno.test('the Pro page line shows the person their own numbers at the limit', () => {
  assertEquals(
    proLine(free(50), { saves: 50, collections: 9, opened: 14 }),
    "You've saved 50 things into 9 collections, and went back to them 14 times. Everything you saved stays yours.",
  );
  assertEquals(
    proLine(free(50), { saves: 50, collections: 1, opened: 0 }),
    "You've saved 50 things into 1 collection. Everything you saved stays yours.",
  );
  assertEquals(proLine(free(50), undefined), "You've used your 50 free saves. Everything you saved stays yours.");
  assertEquals(proLine(free(32), undefined), "You've used 32 of your 50 free saves. Pro has no limit.");
});
