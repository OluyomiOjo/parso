// Parso Pro and RevenueCat. RevenueCat knows each person by their Parso account id (the app logs in with it), and
// tells us about subscriptions in two ways: webhook events (revenuecat-webhook) and, right after a purchase, a
// direct question from sync-pro. Either way the answer lands in profiles.pro_until, the database's record of Pro.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const ENTITLEMENT = 'pro'; // set up in RevenueCat; both Parso Pro products unlock it
const API = 'https://api.revenuecat.com/v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ProState = { pro_until: string | null; pro_product: string | null; pro_store: string | null };

// The Parso account an event belongs to: the first id RevenueCat knows that looks like one of ours.
export function accountIdOf(ids: (string | null | undefined)[]): string | null {
  return ids.find((id): id is string => typeof id === 'string' && UUID.test(id)) ?? null;
}

// Asks RevenueCat for the person's current Pro entitlement. Null when RevenueCat can't be asked (no secret key
// yet, or it's unreachable); callers then fall back to what the event said.
export async function fetchProState(userId: string): Promise<ProState | null> {
  const key = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (!key) return null;
  const res = await fetch(`${API}/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!res?.ok) return null;
  const body = await res.json();
  const entitlement = body?.subscriber?.entitlements?.[ENTITLEMENT];
  if (!entitlement) return { pro_until: null, pro_product: null, pro_store: null };
  const product: string | null = entitlement.product_identifier ?? null;
  const subscription = product ? body.subscriber.subscriptions?.[product] : null;
  // A lifetime grant has no expiry; keep Pro far ahead.
  const until = entitlement.expires_date ?? '2999-01-01T00:00:00Z';
  // A refunded subscription ends Pro now.
  const refunded = subscription?.refunded_at ? subscription.refunded_at : null;
  return { pro_until: refunded ?? until, pro_product: product, pro_store: subscription?.store ?? null };
}

export async function writeProState(db: SupabaseClient, userId: string, state: ProState) {
  const { error } = await db
    .from('profiles')
    .upsert({ user_id: userId, ...state, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw new Error(`profiles update failed: ${error.message}`);
}

// RevenueCat's webhook event, the fields we use.
export type RevenueCatEvent = {
  id: string;
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  store?: string;
  environment?: string;
  price?: number | null;
  currency?: string | null;
  period_type?: string;
  purchased_at_ms?: number | null;
  expiration_at_ms?: number | null;
  cancel_reason?: string | null;
};

const GRANTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'SUBSCRIPTION_EXTENDED',
  'TEMPORARY_ENTITLEMENT_GRANT',
]);

// What the event alone says about Pro, used when RevenueCat can't be asked directly. Null: no change.
export function stateFromEvent(event: RevenueCatEvent, now = Date.now()): ProState | null {
  const at = (ms?: number | null) => (ms ? new Date(ms).toISOString() : null);
  const product = event.product_id ?? null;
  const store = event.store ?? null;
  if (GRANTS.has(event.type)) return { pro_until: at(event.expiration_at_ms), pro_product: product, pro_store: store };
  if (event.type === 'EXPIRATION')
    return { pro_until: at(event.expiration_at_ms) ?? at(now), pro_product: product, pro_store: store };
  // A refund through customer support ends Pro straight away; a normal cancellation keeps it until expiry.
  if (event.type === 'CANCELLATION' && event.cancel_reason === 'CUSTOMER_SUPPORT')
    return { pro_until: at(now), pro_product: product, pro_store: store };
  return null;
}

// Constant-time comparison, so the webhook secret can't be guessed from response timing.
export function sameSecret(given: string | null, expected: string): boolean {
  if (!given || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
