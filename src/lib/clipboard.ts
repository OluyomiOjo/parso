import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { router, useSegments } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { clipboardChangeCount } from '../../modules/clipboard-change';

// Offers a copied link in the mini sheet (/copied-link) once per new copy. hasUrlAsync asks iOS only
// whether a link is there, and the clipboard's change count (our modules/clipboard-change) says whether
// anything new was copied; neither reads the clipboard, so no "Allow paste" alert. The link itself is read
// only through Apple's paste button in the sheet. Owner-approved in step 10.
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

// Checks when Parso opens and when it comes back to the front, and only while one of the four tabs is
// showing: never over a save sheet, the Add screen or a share that is arriving.
export function useCopiedLinkOffer() {
  const segments = useSegments();
  const { hasShareIntent } = useShareIntentContext();
  const onTabs = segments[0] === '(tabs)' && !hasShareIntent;
  const onTabsRef = useRef(onTabs);
  onTabsRef.current = onTabs;

  useEffect(() => {
    const check = () => {
      if (!onTabsRef.current) return; // not marked as offered, so it's offered next time instead
      shouldOffer()
        .then((offer) => {
          if (offer && onTabsRef.current) router.push('/copied-link');
        })
        .catch(() => undefined);
    };
    check();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && check());
    return () => sub.remove();
  }, []);
}
