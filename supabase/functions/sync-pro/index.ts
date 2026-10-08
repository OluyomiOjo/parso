// Right after a purchase or restore, the app asks this to bring the person's Pro status up to date straight away
// (the webhook can take a few seconds). Only ever about the caller: the user comes from their own login.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { fetchProState, writeProState } from '../_shared/revenuecat.ts';

const json = (body: unknown, status = 200) => Response.json(body, { status });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Sign in first.' }, 401);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return json({ error: 'Sign in first.' }, 401);

  const state = await fetchProState(data.user.id);
  if (!state) return json({ synced: false }); // RevenueCat not reachable or not set up yet; the webhook catches up
  try {
    await writeProState(db, data.user.id, state);
  } catch (e) {
    console.error('sync-pro failed', data.user.id, e);
    return json({ error: "Couldn't update Pro. Try again." }, 500);
  }
  return json({ synced: true, pro_until: state.pro_until });
});
