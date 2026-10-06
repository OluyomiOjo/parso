import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import type { Database } from './database.types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!url || !key) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY must be set at build time.');
}

// If the server answers "not signed in" (401) while the phone thinks it is, the sign-in token most likely
// expired while Parso was in the background and hadn't been renewed yet. Renew it once and repeat the
// request, so the person never sees a failed save for it. Sign-in requests themselves are left alone.
const REFRESHABLE = /\/(rest|functions|storage)\/v1\//;
let renewing: Promise<string | null> | null = null;

function renewedToken(): Promise<string | null> {
  renewing ??= supabase.auth
    .refreshSession()
    .then(({ data }) => data.session?.access_token ?? null)
    .catch(() => null)
    .finally(() => {
      renewing = null;
    });
  return renewing;
}

async function fetchWithRenewal(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  const target = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (response.status !== 401 || !REFRESHABLE.test(target)) return response;
  const token = await renewedToken();
  if (!token) return response; // really signed out: let the screen handle it
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export const supabase = createClient<Database>(url, key, {
  global: { fetch: fetchWithRenewal },
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Only refresh the session while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
