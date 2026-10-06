import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library/legacy';
import { Share } from 'react-native';

import { shareText } from './noteFormat';
import type { SaveDetail } from './saves';
import { supabase } from './supabase';

// Owner's line on everything sent out of Parso. Messages, WhatsApp, Mail and Notes link "Parso.ai" themselves.
export const SHARE_FOOTER = 'Saved with Parso.ai';

export const SHARE_FAILED = "Couldn't get this photo. Check your connection and try again.";
export const DOWNLOAD_FAILED = "Couldn't save to Photos. Allow Parso to add photos in Settings, then try again.";

type Shareable = Pick<SaveDetail, 'id' | 'kind' | 'title' | 'url' | 'raw_text' | 'thumbnail_path'>;

const isPhoto = (kind: string) => kind === 'image' || kind === 'screenshot';

export function shareMessage(save: Shareable): string {
  const body =
    save.kind === 'link'
      ? [save.title, save.url].filter(Boolean).join('\n')
      : save.kind === 'text'
        ? save.raw_text
          ? shareText(save.raw_text)
          : (save.title ?? '')
        : '';
  return body ? `${body}\n\n${SHARE_FOOTER}` : SHARE_FOOTER;
}

// The photo as it was saved (uploads/<user>/<save>.jpg), or the thumbnail if that's all there is,
// copied to the phone so the share sheet and Photos can use it.
export async function localPhoto(save: Shareable, userId: string): Promise<string> {
  const candidates: [string, string][] = [['uploads', `${userId}/${save.id}.jpg`]];
  if (save.thumbnail_path) candidates.push(['thumbnails', save.thumbnail_path]);
  for (const [bucket, path] of candidates) {
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
    if (!data?.signedUrl) continue;
    const file = await File.downloadFileAsync(data.signedUrl, new File(Paths.cache, `parso-${save.id}.jpg`), {
      idempotent: true,
    }).catch(() => null);
    if (file) return file.uri;
  }
  throw new Error(SHARE_FAILED);
}

export async function shareSave(save: Shareable, userId: string) {
  const message = shareMessage(save);
  if (isPhoto(save.kind)) {
    await Share.share({ url: await localPhoto(save, userId), message });
  } else {
    await Share.share({ message });
  }
}

export async function downloadPhoto(save: Shareable, userId: string) {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) throw new Error(DOWNLOAD_FAILED);
  await MediaLibrary.saveToLibraryAsync(await localPhoto(save, userId));
}
