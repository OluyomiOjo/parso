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

export const extensionFor = (mediaType: ImageData['mediaType']) => mediaType.split('/')[1].replace('jpeg', 'jpg');
