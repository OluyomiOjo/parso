import { SaveFormat, ImageManipulator } from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import type { ShareIntent } from 'expo-share-intent';

import { isOnline } from './connection';
import { detectSource, displayUrl, normalizeUrl } from './links';
import { noteTitle } from './noteFormat';
import { ALREADY_SAVED, queueNewSave } from './outbox';
import type { QueuedRow } from './outboxQueue';
import { isLimitError, LIMIT_MESSAGE } from './plan';
import { addPreviewImage } from './previewImage';
import { canSave, type WaitingSave } from './pro';
import { supabase } from './supabase';

const MAX_IMAGE_SIDE = 1600; // keeps uploads small and within the AI's image limit
const JPEG_QUALITY = 0.8;
const SCREENSHOT_RATIO = 1.9; // phone screens are about 2.17:1; photos are 4:3 or 3:2
const MAX_TEXT = 20_000; // the database's limit (migration 0018)

// kind and source come back for the usage numbers (src/lib/track.ts).
// queued: no internet, so the save waits on the phone and is sent when the connection is back (src/lib/outbox.ts).
export type ShareResult =
  | { saveId: string; kind: string; source: string; existing?: true; queued?: true }
  | { error: string; limit?: true };

// A free account has used its 50 saves (CLAUDE.md scope 15): the caller opens Parso Pro instead of an error.
export const LIMIT_REACHED: ShareResult = { error: LIMIT_MESSAGE, limit: true };

// The first web address inside shared text ("Check this out https://..."), without trailing punctuation.
export function firstUrlIn(text: string): string | null {
  const match = /https?:\/\/[^\s<>"']+/i.exec(text);
  return match ? normalizeUrl(match[0].replace(/[).,!?]+$/, '')) : null;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// An image on the phone, from a share, the photo picker or the Screenshots album.
export type LocalImage = {
  uri: string;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
  isScreenshot?: boolean; // known for the Screenshots album; otherwise guessed from shape
};

// Photos aren't kept for later offline (only links, text and notes are): they say so instead.
export const PHOTO_OFFLINE = "No internet, so the photo wasn't saved. Try again when you're back online.";

export async function saveImage(image: LocalImage, userId: string): Promise<ShareResult> {
  if (!isOnline()) return { error: PHOTO_OFFLINE };
  if (!(await canSave())) return LIMIT_REACHED; // checked before uploading, so no file is left behind
  const width = image.width ?? 0;
  const height = image.height ?? 0;
  const isScreenshot =
    image.isScreenshot ?? (image.mimeType === 'image/png' && width > 0 && height / width >= SCREENSHOT_RATIO);

  // Shrink the long side, then re-encode as JPEG.
  const context = ImageManipulator.manipulate(image.uri);
  if (Math.max(width, height) > MAX_IMAGE_SIDE) {
    context.resize(width >= height ? { width: MAX_IMAGE_SIDE } : { height: MAX_IMAGE_SIDE });
  }
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: JPEG_QUALITY,
    base64: true,
  });
  if (!result.base64) return { error: "Couldn't read that image. Share it again." };

  // The file goes up first, under the save's id, so the server finds it as soon as the save exists.
  const id = Crypto.randomUUID();
  const { error: uploadError } = await supabase.storage
    .from('uploads')
    .upload(`${userId}/${id}.jpg`, base64ToBytes(result.base64).buffer as ArrayBuffer, { contentType: 'image/jpeg' });
  if (uploadError)
    return {
      error: isOnline() ? "Couldn't upload the image. Check your connection and share it again." : PHOTO_OFFLINE,
    };

  const kind = isScreenshot ? 'screenshot' : 'image';
  const { error } = await supabase.from('saves').insert({ id, kind, source: 'other' });
  if (isLimitError(error)) return LIMIT_REACHED;
  return error ? { error: "Couldn't save the image. Share it again." } : { saveId: id, kind, source: 'other' };
}

// The page's own preview picture, as iOS read it when sharing from Safari. The server uses it for sites
// that refuse servers (Medium, for example). Only full https links fit the database's rule.
function sharedPreviewImage(intent: ShareIntent): string | null {
  const image = intent.meta?.['og:image'] ?? intent.meta?.['twitter:image'];
  return image && /^https:\/\//i.test(image) && image.length <= 2048 ? image : null;
}

// No internet: the link or text waits on the phone, and the save sheet says so.
async function queueLinkOrText(userId: string, row: QueuedRow): Promise<ShareResult> {
  const queued = await queueNewSave(userId, row, 'share');
  if ('alreadySaved' in queued) return { error: ALREADY_SAVED };
  return { saveId: queued.id, kind: row.kind ?? 'text', source: row.source ?? 'other', queued: true };
}

async function saveLinkOrText(intent: ShareIntent, userId: string): Promise<ShareResult> {
  const text = intent.text?.trim() ?? '';
  const url = (intent.webUrl && normalizeUrl(intent.webUrl)) || (text ? firstUrlIn(text) : null);
  // Keep any words shared alongside the link (a caption, a WhatsApp message) for the AI.
  const extra = [intent.meta?.title, text && text !== intent.webUrl ? text : null].filter(Boolean).join('\n');

  if (!url && !text) return { error: 'Nothing to save in what was shared.' };
  const previewImage = sharedPreviewImage(intent);
  const row: QueuedRow = url
    ? {
        kind: 'link',
        source: detectSource(url),
        url,
        raw_text: extra ? extra.slice(0, MAX_TEXT) : null,
        preview_image_url: previewImage,
      }
    : { kind: 'text', source: 'other', raw_text: text.slice(0, MAX_TEXT) };
  if (!isOnline()) return queueLinkOrText(userId, row);
  // Already saved: its sheet opens as "Already in …" instead of saving it again (owner report on Android: the
  // same link shared twice made two saves). Same check as a pasted link (useCreateLinkSave).
  if (url) {
    const { data: found, error: findError } = await supabase
      .from('saves')
      .select('id, kind, source')
      .eq('url', url)
      .order('created_at', { ascending: false })
      .limit(1);
    if (findError && !isOnline()) return queueLinkOrText(userId, row);
    if (found?.[0]) return { saveId: found[0].id, kind: found[0].kind, source: found[0].source, existing: true };
  }
  if (!(await canSave())) return LIMIT_REACHED;
  const { data, error } = await supabase
    .from('saves')
    .insert(row as { kind: string; source: string })
    .select('id')
    .single();
  if (isLimitError(error)) return LIMIT_REACHED;
  if (error && !isOnline()) return queueLinkOrText(userId, row);
  if (error || !data)
    return {
      error: "Couldn't save that. Check your connection and share it again.",
    };
  // Shared from an app, not Safari: no preview picture came with it, so the phone looks for one.
  if (url && !previewImage)
    void addPreviewImage({
      id: data.id,
      kind: 'link',
      source: detectSource(url),
      url,
    });
  return url
    ? { saveId: data.id, kind: 'link', source: detectSource(url) }
    : { saveId: data.id, kind: 'text', source: 'other' };
}

// What was shared, for the Pro page's "Waiting to save" card when the free limit stops it.
export function sharePreview(intent: ShareIntent): WaitingSave {
  const image = intent.files?.find((f) => f.mimeType.startsWith('image/'));
  if (image) return { title: 'Photo', kind: 'image', source: 'other', imageUri: image.path };
  const text = intent.text?.trim() ?? '';
  const url = (intent.webUrl && normalizeUrl(intent.webUrl)) || (text ? firstUrlIn(text) : null);
  if (url) return { title: intent.meta?.title?.trim() || displayUrl(url), kind: 'link', source: detectSource(url) };
  return { title: noteTitle(text) ?? 'Note', kind: 'text', source: 'other' };
}

// A link on its own (the copied-link sheet), saved the same way as a shared one.
export const linkIntent = (url: string): ShareIntent => ({
  files: null,
  type: 'weburl',
  webUrl: url,
  text: null,
  meta: null,
});

export async function saveShare(intent: ShareIntent, userId: string): Promise<ShareResult> {
  const image = intent.files?.find((f) => f.mimeType.startsWith('image/'));
  try {
    return image
      ? await saveImage(
          {
            uri: image.path,
            width: image.width,
            height: image.height,
            mimeType: image.mimeType,
          },
          userId,
        )
      : await saveLinkOrText(intent, userId);
  } catch {
    return { error: "Couldn't save that. Share it again." };
  }
}
