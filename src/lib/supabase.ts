import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { reportAnswer, reportNoAnswer } from './connection';
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

// Every request also tells src/lib/connection.ts whether the server answered, so Parso knows when it's offline.
async function fetchWithRenewal(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (error) {
    if (!init?.signal?.aborted) await reportNoAnswer();
    throw error;
  }
  reportAnswer();
  const target = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (response.status !== 401 || !REFRESHABLE.test(target)) return response;
  const token = await renewedToken();
  if (!token) return response; // really signed out: let the screen handle it
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

// supabase-js's own default name for where the sign-in is kept on the phone, spelled out so it can be read below.
const STORAGE_KEY = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;

export const supabase = createClient<Database>(url, key, {
  global: { fetch: fetchWithRenewal },
  auth: {
    storage: AsyncStorage,
    storageKey: STORAGE_KEY,
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

// The sign-in kept on the phone, read without the network. Offline, supabase-js can't renew an expired sign-in
// and reports none, which used to show the welcome screen (or nothing) to someone still signed in; the app uses
// this instead until the server can be asked (src/lib/auth.tsx). Its user id is all the screens need offline.
export async function storedSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const session = raw ? (JSON.parse(raw) as Session) : null;
    return session?.access_token && session.refresh_token && session.user?.id ? session : null;
  } catch {
    return null;
  }
}
