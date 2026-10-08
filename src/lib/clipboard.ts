import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { router, useSegments } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { clipboardChangeCount } from '../../modules/clipboard-change';

// Offers a copied link in the mini sheet (/copied-link) once per new copy. hasUrlAsync asks iOS only
// whether a link is there, and the clipboard's change count (our modules/clipboard-change) says whether
// anything new was copied; neither reads the clipboard, so no "Allow paste" alert. The link itself is read
// only through Apple's paste button in the sheet. Owner-approved in step 10; any screen since build 9.
const OFFERED_KEY = 'parso.clipboard.offeredCount';

async function shouldOffer(): Promise<boolean> {
  if (!Clipboard.isPasteButtonAvailable) return false; // iOS 16 and later
  const count = clipboardChangeCount();
  if (count === null) return false; // Android, or an older build: never nag
  if (String(count) === (await AsyncStorage.getItem(OFFERED_KEY))) return false;
  if (!(await Clipboard.hasUrlAsync())) return false;
  await AsyncStorage.setItem(OFFERED_KEY, String(count)); // offered once, whatever the person does next
  return true;
}

// Screens it must never cover: sheets the person is in the middle of, and sign-in. Everywhere else (the tabs,
// a save's detail page, a collection, Reminders) it may appear. Owner request, step 10.
const BLOCKED = new Set([
  'save',
  'add',
  'copied-link',
  'item-edit',
  'photo',
  'collection-rename',
  'reminder-time',
  'note', // typing a note
  'upgrade',
  'intro',
  'welcome',
]);

// Checks when Parso opens and when it comes back to the front. If a blocked screen is showing then, the offer
// waits and is made as soon as the person is back on an ordinary screen.
export function useCopiedLinkOffer(signedIn: boolean) {
  const segments = useSegments();
  const { hasShareIntent } = useShareIntentContext();
  const allowed = signedIn && !hasShareIntent && !BLOCKED.has(segments[0] ?? '');
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && setPending(true));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!pending || !allowed) return;
    setPending(false);
    shouldOffer()
      .then((offer) => {
        if (offer) router.push('/copied-link');
      })
      .catch(() => undefined);
  }, [pending, allowed]);
}
