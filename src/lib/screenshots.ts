import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useSession } from './auth';
import { saveImage } from './share';
import { track } from './track';

// iOS gives apps no event when a screenshot is taken, so Parso looks in the Screenshots album each time it
// opens and offers what's new. Nothing is uploaded unless the person taps Save. Owner-approved in step 10 in
// place of automatic background import (out of scope in CLAUDE.md).
const ENABLED_KEY = 'parso.screenshots.enabled'; // '1' on, '0' off, missing = not asked yet
const CHECKED_KEY = 'parso.screenshots.checkedAt'; // ms; only screenshots taken after this are offered
const MAX_OFFERED = 20;

export type NewScreenshot = { id: string; uri: string; width: number; height: number; createdAt: number };

export type ScreenshotState =
  | { status: 'loading' | 'off' | 'none' }
  | { status: 'ask' } // never asked: offer to turn the check on
  | { status: 'needsFullAccess' } // on, but iOS only shares selected photos (or none)
  | { status: 'new'; screenshots: NewScreenshot[] };

const hasFullAccess = (p: MediaLibrary.PermissionResponse) => p.granted && p.accessPrivileges === 'all';

async function readState(): Promise<ScreenshotState> {
  const enabled = await AsyncStorage.getItem(ENABLED_KEY);
  if (enabled === null) return { status: 'ask' };
  if (enabled === '0') return { status: 'off' };
  if (!hasFullAccess(await MediaLibrary.getPermissionsAsync())) return { status: 'needsFullAccess' };

  const checkedAt = Number((await AsyncStorage.getItem(CHECKED_KEY)) ?? Date.now());
  const page = await MediaLibrary.getAssetsAsync({
    mediaType: 'photo',
    mediaSubtypes: ['screenshot'],
    createdAfter: checkedAt,
    sortBy: [['creationTime', false]],
    first: MAX_OFFERED,
  });
  if (!page.assets.length) return { status: 'none' };
  // Thumbnails and uploads need a file address; the library's own ph:// address isn't readable by images.
  const screenshots = await Promise.all(
    page.assets.map(async (a) => {
      const info = await MediaLibrary.getAssetInfoAsync(a);
      return { id: a.id, uri: info.localUri ?? a.uri, width: a.width, height: a.height, createdAt: a.creationTime };
    }),
  );
  return { status: 'new', screenshots };
}

const markChecked = (at: number) => AsyncStorage.setItem(CHECKED_KEY, String(at));

export async function setScreenshotCheck(on: boolean) {
  await AsyncStorage.setItem(ENABLED_KEY, on ? '1' : '0');
  if (on) await markChecked(Date.now()); // offer screenshots from now on, not the whole history
}

export async function screenshotCheckEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY)) === '1';
}

export function useNewScreenshots() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const [state, setState] = useState<ScreenshotState>({ status: 'loading' });
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(() => {
    readState()
      .then(setState)
      .catch(() => setState({ status: 'none' }));
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  // Asks iOS for photo access. "Allow full access" is what lets Parso see new screenshots.
  const turnOn = async () => {
    await setScreenshotCheck(true);
    await MediaLibrary.requestPermissionsAsync(false, ['photo']).catch(() => undefined);
    refresh();
  };

  const notNow = async () => {
    if (state.status === 'ask') await setScreenshotCheck(false);
    else if (state.status === 'new') await markChecked(Math.max(...state.screenshots.map((s) => s.createdAt)));
    refresh();
  };

  // Saves each new screenshot like one shared from Photos; the AI files them one by one.
  const saveAll = async (): Promise<number> => {
    if (state.status !== 'new' || !session) return 0;
    setSaving(true);
    let failed = 0;
    for (const s of [...state.screenshots].reverse()) {
      const result = await saveImage(
        { uri: s.uri, width: s.width, height: s.height, isScreenshot: true },
        session.user.id,
      );
      if ('error' in result) failed++;
      else track('save_created', { kind: 'screenshot', source: 'other', via: 'screenshots' });
    }
    await markChecked(Math.max(...state.screenshots.map((s) => s.createdAt)));
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ['saves', session.user.id] });
    refresh();
    return failed;
  };

  return { state, saving, turnOn, notNow, saveAll, refresh };
}
