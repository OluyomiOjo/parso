import { SaveFormat, ImageManipulator } from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import type { ShareIntent } from 'expo-share-intent';

import { detectSource, normalizeUrl } from './links';
import { supabase } from './supabase';

const MAX_IMAGE_SIDE = 1600; // keeps uploads small and within the AI's image limit
const JPEG_QUALITY = 0.8;
const SCREENSHOT_RATIO = 1.9; // phone screens are about 2.17:1; photos are 4:3 or 3:2
const MAX_TEXT = 5000;

export type ShareResult = { saveId: string } | { error: string };

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

export async function saveImage(image: LocalImage, userId: string): Promise<ShareResult> {
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
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY, base64: true });
  if (!result.base64) return { error: "Couldn't read that image. Share it again." };

  // The file goes up first, under the save's id, so the server finds it as soon as the save exists.
  const id = Crypto.randomUUID();
  const { error: uploadError } = await supabase.storage
    .from('uploads')
    .upload(`${userId}/${id}.jpg`, base64ToBytes(result.base64).buffer as ArrayBuffer, { contentType: 'image/jpeg' });
  if (uploadError) return { error: "Couldn't upload the image. Check your connection and share it again." };

  const { error } = await supabase
    .from('saves')
    .insert({ id, kind: isScreenshot ? 'screenshot' : 'image', source: 'other' });
  return error ? { error: "Couldn't save the image. Share it again." } : { saveId: id };
}

// The page's own preview picture, as iOS read it when sharing from Safari. The server uses it for sites
// that refuse servers (Medium, for example). Only full https links fit the database's rule.
function sharedPreviewImage(intent: ShareIntent): string | null {
  const image = intent.meta?.['og:image'] ?? intent.meta?.['twitter:image'];
  return image && /^https:\/\//i.test(image) && image.length <= 2048 ? image : null;
}

// Typed or pasted text from the Add screen: a link inside it is saved as the link, the rest kept with it.
export function saveText(text: string): Promise<ShareResult> {
  return saveLinkOrText({ text, webUrl: null, files: null, type: 'text', meta: null } as ShareIntent);
}

async function saveLinkOrText(intent: ShareIntent): Promise<ShareResult> {
  const text = intent.text?.trim() ?? '';
  const url = (intent.webUrl && normalizeUrl(intent.webUrl)) || (text ? firstUrlIn(text) : null);
  // Keep any words shared alongside the link (a caption, a WhatsApp message) for the AI.
  const extra = [intent.meta?.title, text && text !== intent.webUrl ? text : null].filter(Boolean).join('\n');

  if (!url && !text) return { error: 'Nothing to save in what was shared.' };
  const { data, error } = await supabase
    .from('saves')
    .insert(
      url
        ? {
            kind: 'link',
            source: detectSource(url),
            url,
            raw_text: extra ? extra.slice(0, MAX_TEXT) : null,
            preview_image_url: sharedPreviewImage(intent),
          }
        : { kind: 'text', source: 'other', raw_text: text.slice(0, MAX_TEXT) },
    )
    .select('id')
    .single();
  return error || !data
    ? { error: "Couldn't save that. Check your connection and share it again." }
    : { saveId: data.id };
}

export async function saveShare(intent: ShareIntent, userId: string): Promise<ShareResult> {
  const image = intent.files?.find((f) => f.mimeType.startsWith('image/'));
  try {
    return image
      ? await saveImage({ uri: image.path, width: image.width, height: image.height, mimeType: image.mimeType }, userId)
      : await saveLinkOrText(intent);
  } catch {
    return { error: "Couldn't save that. Share it again." };
  }
}
