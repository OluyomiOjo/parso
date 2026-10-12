import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

// Whether Parso can reach its server, without a network library: a request that fails to get any answer is
// checked with one small request to the server's health address, and only if that fails too is the phone
// treated as offline. While offline the same check runs every few seconds and whenever Parso comes back to
// the front. TanStack Query's onlineManager carries the answer: offline, lists stop retrying (they keep what
// the phone has) and fetch again as soon as the connection is back.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const CHECK_TIMEOUT_MS = 4000;
const RECHECK_MS = 10_000;

let checking: Promise<boolean> | null = null;
let recheckTimer: ReturnType<typeof setInterval> | null = null;

function setOnline(online: boolean) {
  if (onlineManager.isOnline() === online) return;
  onlineManager.setOnline(online);
  if (online && recheckTimer) {
    clearInterval(recheckTimer);
    recheckTimer = null;
  } else if (!online && !recheckTimer) {
    recheckTimer = setInterval(() => void checkConnection(), RECHECK_MS);
  }
}

// One check at a time; everyone asking meanwhile gets the same answer.
export function checkConnection(): Promise<boolean> {
  checking ??= (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
    try {
      await fetch(`${url}/auth/v1/health`, { headers: { apikey: key ?? '' }, signal: controller.signal });
      return true; // any answer at all means the server can be reached
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  })()
    .then((online) => {
      setOnline(online);
      return online;
    })
    .finally(() => {
      checking = null;
    });
  return checking;
}

// Called by Parso's own fetch (src/lib/supabase.ts): an answer means online; no answer is double-checked.
export function reportAnswer() {
  setOnline(true);
}

export async function reportNoAnswer() {
  await checkConnection();
}

export const isOnline = () => onlineManager.isOnline();

export function useOnline(): boolean {
  return useSyncExternalStore(onlineManager.subscribe.bind(onlineManager), isOnline);
}

// Checked once at launch (so an offline start shows straight away) and on every return to the front.
void checkConnection();
AppState.addEventListener('change', (state) => {
  if (state === 'active') void checkConnection();
});
