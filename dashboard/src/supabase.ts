import { createClient } from '@supabase/supabase-js';

// The same Supabase project as the app. Only the public (publishable) key is here; every number comes from
// the admin-stats function, which checks the signed-in email against the admins table.
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY, {
  auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' },
});
