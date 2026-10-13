// Run with: npx -y deno@2.9.6 test --no-lock tests/
import { assertEquals } from 'jsr:@std/assert@1';

import {
  freeSavesLeft,
  isLimitError,
  needsUpgrade,
  percentSaved,
  milestoneLine,
  offerAfterFirstSave,
  trialButton,
  trialDays,
  trialReminderAt,
  trialReminderText,
  trialTerms,
  planLine,
  proHeadline,
  proMoment,
  proNumbers,
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

Deno.test('the Pro page speaks to the moment it opened in', () => {
  assertEquals(proMoment(free(50), true), 'stopped');
  assertEquals(proMoment(free(50), false), 'limit');
  assertEquals(proMoment(free(32), false), 'before');
  assertEquals(proHeadline('stopped'), "You've used your 50 free saves");
  assertEquals(proNumbers('stopped', free(50), undefined), 'Subscribe to Parso Pro and this saves straight away.');
  assertEquals(proHeadline('limit'), "You've built something worth keeping");
  assertEquals(proHeadline('before'), 'Save as much as you like with Pro');
});

Deno.test('the Pro page shows the person their own numbers at the limit', () => {
  assertEquals(
    proNumbers('limit', free(50), { saves: 50, collections: 11, opened: 55 }),
    "50 saves in 11 collections. You've gone back to them 55 times.",
  );
  assertEquals(proNumbers('limit', free(50), { saves: 50, collections: 1, opened: 0 }), '50 saves in 1 collection.');
  assertEquals(proNumbers('limit', free(50), undefined), "You've used your 50 free saves.");
  assertEquals(proNumbers('before', free(32), undefined), '32 of your 50 free saves used.');
  assertEquals(proNumbers('before', undefined, undefined), null);
});

Deno.test('save 30, and only save 30, gets the friendly heads-up', () => {
  assertEquals(
    milestoneLine(free(30), { saves: 30, collections: 7, opened: 12 }),
    "That's 30 saves in 7 collections, and you've gone back to them 12 times. 20 free saves left.",
  );
  assertEquals(
    milestoneLine(free(30), { saves: 30, collections: 7, opened: 0 }),
    "That's 30 saves in 7 collections. 20 free saves left.",
  );
  assertEquals(milestoneLine(free(30), undefined), "That's 30 saves. 20 free saves left.");
  assertEquals(milestoneLine(free(29), { saves: 29, collections: 7, opened: 12 }), null);
  assertEquals(milestoneLine(free(31), { saves: 31, collections: 7, opened: 12 }), null);
  assertEquals(milestoneLine({ ...free(30), pro: true }, undefined), null);
});

Deno.test('the free trial: its length, wording and reminder', () => {
  assertEquals(trialDays({ price: 0, periodUnit: 'WEEK', periodNumberOfUnits: 2 }), 14);
  assertEquals(trialDays({ price: 0, periodUnit: 'DAY', periodNumberOfUnits: 14 }), 14);
  assertEquals(trialDays({ price: 0.99, periodUnit: 'WEEK', periodNumberOfUnits: 1 }), null); // a paid intro, not free
  assertEquals(trialDays(null), null);
  assertEquals(trialButton(14), 'Start free for 14 days');
  assertEquals(trialTerms('$39.99'), 'Then $39.99 a year. Cancel anytime.');
  const ends = new Date(2026, 9, 27, 10, 0);
  assertEquals(trialReminderAt(ends, new Date(2026, 9, 13, 10, 0)), new Date(2026, 9, 25, 10, 0));
  assertEquals(trialReminderAt(ends, new Date(2026, 9, 26, 10, 0)), null); // too late to remind
  assertEquals(trialReminderText(ends, MONTHS).body, 'It renews on Oct 27 unless you cancel in Settings.');
});

Deno.test('the Pro page after the first save, once, and with the trial', () => {
  assertEquals(offerAfterFirstSave(free(1), false), true);
  assertEquals(offerAfterFirstSave(free(1), true), false);
  assertEquals(offerAfterFirstSave(free(0), false), false);
  assertEquals(offerAfterFirstSave(free(50), false), false);
  assertEquals(offerAfterFirstSave({ ...free(3), pro: true }, false), false);
  assertEquals(proMoment(free(1), false, true), 'first');
  assertEquals(proHeadline('first', 14), 'Try Parso Pro free for 14 days');
  assertEquals(proHeadline('first', null), 'Save as much as you like with Pro');
  assertEquals(proNumbers('stopped', free(50), undefined, 14), 'Start your free trial and this saves straight away.');
});
