// Run with: npx -y deno@2.9.6 test --no-lock tests/
import { assertEquals } from 'jsr:@std/assert@1';

import { accountIdOf, sameSecret, stateFromEvent } from '../supabase/functions/_shared/revenuecat.ts';

const ID = '4483f4de-07c6-4326-bfb4-681ab0198cee';
const NOW = Date.UTC(2026, 9, 8, 12);
const base = { id: 'e1', product_id: 'ai.parso.pro.monthly', store: 'APP_STORE' };

Deno.test('events find the Parso account among RevenueCat ids', () => {
  assertEquals(accountIdOf(['$RCAnonymousID:abc', undefined, ID]), ID);
  assertEquals(accountIdOf(['$RCAnonymousID:abc']), null);
});

Deno.test('buying and renewing give Pro until the paid period ends', () => {
  const end = Date.UTC(2026, 10, 8, 12);
  for (const type of ['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE']) {
    assertEquals(stateFromEvent({ ...base, type, expiration_at_ms: end }, NOW)?.pro_until, new Date(end).toISOString());
  }
});

Deno.test('cancelling keeps Pro to the end; a refund or expiry ends it', () => {
  assertEquals(stateFromEvent({ ...base, type: 'CANCELLATION', cancel_reason: 'UNSUBSCRIBE' }, NOW), null);
  assertEquals(
    stateFromEvent({ ...base, type: 'CANCELLATION', cancel_reason: 'CUSTOMER_SUPPORT' }, NOW)?.pro_until,
    new Date(NOW).toISOString(),
  );
  assertEquals(stateFromEvent({ ...base, type: 'EXPIRATION' }, NOW)?.pro_until, new Date(NOW).toISOString());
  assertEquals(stateFromEvent({ ...base, type: 'BILLING_ISSUE' }, NOW), null); // Apple's grace period keeps Pro
});

Deno.test('the webhook password must match exactly', () => {
  assertEquals(sameSecret('abc', 'abc'), true);
  assertEquals(sameSecret('abd', 'abc'), false);
  assertEquals(sameSecret(null, 'abc'), false);
});
