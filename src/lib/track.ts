import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { supabase } from './supabase';

// How Parso is used, for the owner's dashboard at dash.parso.ai. Only an event name and these fixed fields
// are ever sent: never titles, links, notes, text or search words (the database refuses anything else,
// migration 0015). Sending runs in the background and never holds anything up; if it fails it's dropped.
export type EventName =
  | 'app_opened'
  | 'intro_finished'
  | 'signed_in'
  | 'save_created'
  | 'save_opened'
  | 'search_made'
  | 'reminder_set'
  | 'shared_out'
  | 'downloaded'
  | 'view_switched'
  | 'upgrade_shown'
  | 'purchase_made'
  | 'restore_tapped'
  | 'save_done'
  | 'week_opened';

export type EventDetails = {
  source?: string;
  kind?: string;
  via?: 'share' | 'paste' | 'clipboard' | 'screenshots' | 'add' | 'grid' | 'list';
};

// Events from before sign-in (finishing the intro) wait on the phone and go once there's an account.
const PENDING_KEY = 'parso.events.pending';

async function send(rows: ({ name: EventName } & EventDetails)[]) {
  const { error } = await supabase.from('events').insert(rows);
  return !error;
}

export function track(name: EventName, details: EventDetails = {}) {
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await send([{ name, ...details }]);
        return;
      }
      const pending = JSON.parse((await AsyncStorage.getItem(PENDING_KEY)) ?? '[]') as EventName[];
      await AsyncStorage.setItem(PENDING_KEY, JSON.stringify([...pending, name].slice(-10)));
    } catch {
      // usage numbers are never worth an error for the person using the app
    }
  })();
}

async function sendPending() {
  try {
    const pending = JSON.parse((await AsyncStorage.getItem(PENDING_KEY)) ?? '[]') as EventName[];
    if (pending.length && (await send(pending.map((name) => ({ name }))))) await AsyncStorage.removeItem(PENDING_KEY);
  } catch {
    // tried again next time Parso opens
  }
}

const OPEN_GAP_MS = 30 * 60 * 1000; // coming back within half an hour is the same visit

// "App opened" when Parso starts signed in or comes back to the front after a while; also sends anything
// that waited for sign-in.
export function useOpenTracking(signedIn: boolean) {
  useEffect(() => {
    if (!signedIn) return;
    let last = 0;
    const opened = () => {
      if (Date.now() - last < OPEN_GAP_MS) return;
      last = Date.now();
      track('app_opened');
    };
    opened();
    void sendPending();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && opened());
    return () => sub.remove();
  }, [signedIn]);
}
