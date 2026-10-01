// Deletes the signed-in person's account (required by Apple for apps with sign-in). Only ever deletes the
// caller: the user comes from their own login, never from the request body. Their pictures are removed
// first; deleting the auth user then removes their saves and collections (on delete cascade).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const BUCKETS = ['thumbnails', 'uploads'];
const PAGE = 1000;

const json = (body: unknown, status = 200) => Response.json(body, { status });

async function removeFolder(db: SupabaseClient, bucket: string, folder: string) {
  for (;;) {
    const { data, error } = await db.storage.from(bucket).list(folder, { limit: PAGE });
    if (error) throw error;
    if (!data.length) return;
    const { error: removeError } = await db.storage.from(bucket).remove(data.map((f) => `${folder}/${f.name}`));
    if (removeError) throw removeError;
    if (data.length < PAGE) return;
  }
}

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
    for (const bucket of BUCKETS) await removeFolder(admin, bucket, userId);
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;
  } catch (e) {
    console.error('delete-account failed', userId, e);
    return json({ error: "Couldn't delete your account. Check your connection and try again." }, 500);
  }
  return json({ deleted: true });
});
