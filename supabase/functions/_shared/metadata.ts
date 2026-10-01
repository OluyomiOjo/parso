// Public metadata for a saved link: platform lookup endpoints (oEmbed) first, then the page's
// Open Graph / Twitter tags. Never logs in and never follows a login wall.

export type LinkMetadata = {
  title?: string;
  description?: string;
  author?: string;
  siteName?: string;
  imageUrl?: string;
};

const USER_AGENT = 'Mozilla/5.0 (compatible; ParsoBot/1.0; +https://parso.ai)';
const TIMEOUT_MS = 6000;
const MAX_HTML_BYTES = 1_500_000;

// Platforms with a public oEmbed endpoint that returns more than the page itself.
const OEMBED: Record<string, (url: string) => string> = {
  youtube: (u) => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}`,
  tiktok: (u) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(u)}`,
  x: (u) => `https://publish.twitter.com/oembed?omit_script=1&url=${encodeURIComponent(u)}`,
  reddit: (u) => `https://www.reddit.com/oembed?url=${encodeURIComponent(u)}`,
  spotify: (u) => `https://open.spotify.com/oembed?url=${encodeURIComponent(u)}`,
};

// Pages that only show a login wall to anonymous visitors; fetching them adds nothing.
const LOGIN_WALLED = new Set(['facebook']);

async function fetchWithTimeout(url: string, accept: string): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: accept },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

async function readCapped(res: Response, maxBytes: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    total += value.length;
  }
  reader.cancel().catch(() => undefined);
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  return new TextDecoder().decode(bytes.subarray(0, Math.min(total, maxBytes)));
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

const clean = (text: string | undefined) => {
  const t = text ? decodeEntities(text.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() : '';
  return t || undefined;
};

export function parseMetaTags(html: string): LinkMetadata {
  const tags = new Map<string, string>();
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const key = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    const content = /content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i.exec(tag);
    const value = content?.[1] ?? content?.[2];
    if (key && value && !tags.has(key)) tags.set(key, value);
  }
  const titleTag = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1];
  return {
    title: clean(tags.get('og:title') ?? tags.get('twitter:title') ?? titleTag),
    description: clean(tags.get('og:description') ?? tags.get('twitter:description') ?? tags.get('description')),
    siteName: clean(tags.get('og:site_name')),
    imageUrl: tags.get('og:image') ?? tags.get('twitter:image') ?? tags.get('og:image:url'),
  };
}

async function fromOEmbed(source: string, url: string): Promise<LinkMetadata> {
  const endpoint = OEMBED[source];
  if (!endpoint) return {};
  const res = await fetchWithTimeout(endpoint(url), 'application/json');
  if (!res) return {};
  try {
    const data = await res.json();
    // X returns the post text only inside its embed HTML.
    const text = source === 'x' ? clean(/<p[^>]*>([\s\S]*?)<\/p>/i.exec(data.html ?? '')?.[1]) : undefined;
    return {
      title: clean(data.title),
      description: text,
      author: clean(data.author_name),
      siteName: clean(data.provider_name),
      imageUrl: data.thumbnail_url,
    };
  } catch {
    return {};
  }
}

// Instagram's normal pages show no caption and rate-limit quickly; the public embed page (the one other
// websites use to show a post) carries the caption, the account and the image.
const INSTAGRAM_POST = /instagram\.com\/(?:[^/]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i;

async function fromInstagramEmbed(url: string): Promise<LinkMetadata> {
  const match = INSTAGRAM_POST.exec(url);
  if (!match) return {};
  const kind = match[1].toLowerCase() === 'reels' ? 'reel' : match[1].toLowerCase();
  const res = await fetchWithTimeout(`https://www.instagram.com/${kind}/${match[2]}/embed/captioned/`, 'text/html');
  if (!res) return {};
  const html = await readCapped(res, MAX_HTML_BYTES);
  const author = clean(/class="CaptionUsername"[^>]*>([^<]+)</i.exec(html)?.[1]);
  const captionHtml = /class="Caption">([\s\S]*?)<div class="CaptionComments"/i.exec(html)?.[1] ?? '';
  const caption = clean(captionHtml.replace(/<a class="CaptionUsername"[\s\S]*?<\/a>/i, '').replace(/<br\s*\/?>/gi, '\n'));
  const image = /class="EmbeddedMediaImage"[^>]*src="([^"]+)"/i.exec(html)?.[1];
  return {
    title: kind === 'reel' ? 'Instagram reel' : 'Instagram post',
    description: caption,
    author: author ? `@${author}` : undefined,
    siteName: 'Instagram',
    imageUrl: image ? decodeEntities(image) : undefined,
  };
}

async function fromPage(url: string): Promise<LinkMetadata> {
  const res = await fetchWithTimeout(url, 'text/html,application/xhtml+xml');
  if (!res || !(res.headers.get('content-type') ?? '').includes('html')) return {};
  return parseMetaTags(await readCapped(res, MAX_HTML_BYTES));
}

function absolutize(imageUrl: string | undefined, pageUrl: string): string | undefined {
  if (!imageUrl) return undefined;
  try {
    return new URL(decodeEntities(imageUrl), pageUrl).toString();
  } catch {
    return undefined;
  }
}

export async function fetchLinkMetadata(url: string, source: string): Promise<LinkMetadata> {
  if (LOGIN_WALLED.has(source)) return {};
  if (source === 'instagram') {
    const embed = await fromInstagramEmbed(url);
    if (embed.description || embed.imageUrl) return embed;
  }
  const [oembed, page] = await Promise.all([
    fromOEmbed(source, url),
    // oEmbed already covers these fully; skip the heavier page fetch.
    source in OEMBED && source !== 'reddit' ? Promise.resolve({} as LinkMetadata) : fromPage(url),
  ]);
  const merged: LinkMetadata = {
    title: oembed.title ?? page.title,
    description: oembed.description ?? page.description,
    author: oembed.author ?? page.author,
    siteName: oembed.siteName ?? page.siteName,
    imageUrl: oembed.imageUrl ?? page.imageUrl,
  };
  merged.imageUrl = absolutize(merged.imageUrl, url);
  return merged;
}
