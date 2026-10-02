// Deletes one account: their pictures first, then the auth user, which removes their saves, collections,
// events and profile (on delete cascade). Used by delete-account (the person themselves) and admin-stats
// (an admin, from dash.parso.ai).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const BUCKETS = ['thumbnails', 'uploads'];
const PAGE = 1000;

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

export async function deleteAccount(db: SupabaseClient, userId: string) {
  for (const bucket of BUCKETS) await removeFolder(db, bucket, userId);
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) throw error;
}
