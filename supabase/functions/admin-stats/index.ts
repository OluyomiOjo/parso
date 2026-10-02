// The data behind dash.parso.ai. Answers only signed-in people whose email is in the admins table, and only
// with counts, behaviour and sources: never what anyone saved (owner's privacy line). The numbers come from
// the admin_* SQL functions in migration 0016, which only the service role can call.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { deleteAccount } from '../_shared/accounts.ts';

const ALLOWED_ORIGINS = [/^https:\/\/dash\.parso\.ai$/, /^https:\/\/[a-z0-9-]+\.parso-dash\.pages\.dev$/, /^https:\/\/parso-dash\.pages\.dev$/, /^http:\/\/localhost:\d+$/];

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  return ALLOWED_ORIGINS.some((o) => o.test(origin))
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        Vary: 'Origin',
      }
    : {};
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const headers = cors(req);
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const { data: auth } = token ? await db.auth.getUser(token) : { data: { user: null } };
  const email = auth.user?.email?.toLowerCase();
  if (!email) return json({ error: 'Sign in to see the dashboard.' }, 401);
  const { data: admin } = await db.from('admins').select('email').eq('email', email).maybeSingle();
  if (!admin) return json({ error: 'This account is not an admin.' }, 403);

  let body: { action?: string; days?: number; user_id?: string; pro?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Bad request.' }, 400);
  }
  const days = Math.min(Math.max(Math.round(body.days ?? 30), 1), 365);
  const result = async (call: PromiseLike<{ data: unknown; error: { message: string } | null }>) => {
    const { data, error } = await call;
    if (error) {
      console.error('admin-stats', body.action, error.message);
      return json({ error: "Couldn't load this. Refresh to try again." }, 500);
    }
    return json(data);
  };

  switch (body.action) {
    case 'overview':
      return result(db.rpc('admin_overview', { p_days: days }));
    case 'users':
      return result(db.rpc('admin_users'));
    case 'costs':
      return result(db.rpc('admin_costs', { p_days: days }));
    case 'set_pro':
      if (!body.user_id || !UUID.test(body.user_id) || typeof body.pro !== 'boolean') {
        return json({ error: 'Bad request.' }, 400);
      }
      return result(db.rpc('admin_set_pro', { p_user: body.user_id, p_pro: body.pro }));
    case 'delete_user': {
      if (!body.user_id || !UUID.test(body.user_id)) return json({ error: 'Bad request.' }, 400);
      if (body.user_id === auth.user!.id) return json({ error: "You can't delete your own account here." }, 400);
      try {
        await deleteAccount(db, body.user_id);
      } catch (e) {
        console.error('admin delete failed', body.user_id, e);
        return json({ error: "Couldn't delete this account. Try again." }, 500);
      }
      return json({ deleted: true });
    }
    default:
      return json({ error: 'Bad request.' }, 400);
  }
});
