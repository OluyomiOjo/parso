// RevenueCat calls this whenever a Parso Pro subscription changes (bought, renewed, cancelled, expired,
// refunded). It records the event for the dashboard's Revenue page and updates the person's Pro status.
// RevenueCat sends the password set in its webhook settings; the same value is the REVENUECAT_WEBHOOK_AUTH secret.
import { createClient } from 'npm:@supabase/supabase-js@2';

import {
  accountIdOf,
  fetchProState,
  sameSecret,
  stateFromEvent,
  writeProState,
  type RevenueCatEvent,
} from '../_shared/revenuecat.ts';

const json = (body: unknown, status = 200) => Response.json(body, { status });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  const expected = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  if (!expected) return json({ error: 'Not set up yet.' }, 503);
  const given = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  if (!sameSecret(given, expected)) return json({ error: 'Unauthorized' }, 401);

  let event: RevenueCatEvent;
  try {
    event = (await req.json()).event;
    if (!event?.id || !event.type) throw new Error('no event');
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
  if (event.type === 'TEST') return json({ ok: true, test: true }); // the dashboard's "Send test event"

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const candidate = accountIdOf([event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])]);
  let userId: string | null = null;
  if (candidate) {
    const { data } = await db.auth.admin.getUserById(candidate);
    userId = data?.user?.id ?? null;
  }

  // The event id makes a repeated delivery harmless.
  const at = (ms?: number | null) => (ms ? new Date(ms).toISOString() : null);
  const { error: insertError } = await db.from('revenue_events').insert({
    id: event.id,
    user_id: userId,
    type: event.type,
    product_id: event.product_id ?? null,
    store: event.store ?? null,
    environment: event.environment ?? null,
    price_usd: typeof event.price === 'number' ? event.price : null,
    currency: event.currency ?? null,
    period_type: event.period_type ?? null,
    purchased_at: at(event.purchased_at_ms),
    expires_at: at(event.expiration_at_ms),
  });
  if (insertError?.code === '23505') return json({ ok: true, duplicate: true });
  if (insertError) {
    console.error('revenue event insert failed', event.id, insertError.message);
    return json({ error: 'Try again.' }, 500); // RevenueCat retries
  }
  if (!userId) return json({ ok: true, account: 'unknown' });

  try {
    const state = (await fetchProState(userId)) ?? stateFromEvent(event);
    if (state) await writeProState(db, userId, state);
  } catch (e) {
    console.error('pro update failed', event.id, e);
    return json({ error: 'Try again.' }, 500);
  }
  return json({ ok: true });
});
