// Deletes the signed-in person's account (required by Apple for apps with sign-in). Only ever deletes the
// caller: the user comes from their own login, never from the request body.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { deleteAccount } from '../_shared/accounts.ts';

const json = (body: unknown, status = 200) => Response.json(body, { status });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Sign in to delete your account.' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json({ error: 'Sign in to delete your account.' }, 401);
  const userId = data.user.id;

  try {
    await deleteAccount(admin, userId);
  } catch (e) {
    console.error('delete-account failed', userId, e);
    return json({ error: "Couldn't delete your account. Check your connection and try again." }, 500);
  }
  return json({ deleted: true });
});
