// Downloads a preview image so it can be stored (platform image links expire) and shown to the AI.

export type ImageData = { bytes: Uint8Array; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' };

const MAX_BYTES = 5 * 1024 * 1024; // the AI APIs' per-image limit, and the bucket's
const SUPPORTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

export async function downloadImage(url: string): Promise<ImageData | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ParsoBot/1.0; +https://parso.ai)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const mediaType = SUPPORTED.find((t) => t === type);
    if (!mediaType) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_BYTES) return null;
    return { bytes, mediaType };
  } catch {
    return null;
  }
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Width and height from the file's own header, so the app can lay out a picture before it loads.
// Covers the four formats downloadImage accepts; anything unreadable returns null.
export function imageSize(bytes: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (at: number, length: number) => String.fromCharCode(...bytes.subarray(at, at + length));
  const valid = (width: number, height: number) => (width > 0 && height > 0 ? { width, height } : null);
  try {
    if (ascii(1, 3) === 'PNG') return valid(view.getUint32(16), view.getUint32(20));
    if (ascii(0, 3) === 'GIF') return valid(view.getUint16(6, true), view.getUint16(8, true));
    if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
      const chunk = ascii(12, 4);
      if (chunk === 'VP8 ') return valid(view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff);
      if (chunk === 'VP8L') {
        const bits = view.getUint32(21, true);
        return valid((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1);
      }
      if (chunk === 'VP8X') {
        const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
        const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
        return valid(width, height);
      }
      return null;
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      // JPEG: walk the segments to the first start-of-frame marker (C0 to CF, except C4, C8 and CC).
      let at = 2;
      while (at + 9 < bytes.length) {
        if (bytes[at] !== 0xff) return null;
        const marker = bytes[at + 1];
        if (marker === 0xff) {
          at++;
          continue;
        }
        const length = view.getUint16(at + 2);
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return valid(view.getUint16(at + 7), view.getUint16(at + 5));
        }
        at += 2 + length;
      }
    }
  } catch {
    // a truncated header reads past the end
  }
  return null;
}

export const extensionFor = (mediaType: ImageData['mediaType']) => mediaType.split('/')[1].replace('jpeg', 'jpg');
