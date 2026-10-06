// Public metadata for a saved link: platform lookup endpoints (oEmbed) first, then the page's
// Open Graph / Twitter tags. Never logs in and never follows a login wall.

export type LinkMetadata = {
  title?: string;
  description?: string;
  author?: string;
  siteName?: string;
  imageUrl?: string;
  handle?: string; // the poster's public handle, e.g. "@pplreunitedsurprise" or "u/name"; shown instead of the platform
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

// X's oEmbed only accepts the plain post address, not /video/1 or /photo/1 or tracking parameters.
function canonicalXUrl(url: string): string {
  const match = /(?:x|twitter)\.com\/([^/?#]+)\/status\/(\d+)/i.exec(url);
  return match ? `https://x.com/${match[1]}/status/${match[2]}` : url;
}

// X's public post data, the same feed X's own embed widget reads. It has the post text, photos and video
// posters, X Articles (title, opening text, cover picture), quoted posts and link cards. The author's profile
// photo is never used as the post's picture: describing it as the post misled the AI (owner report, step 10).
function xSyndicationToken(id: string): string {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
}

type XMedia = { media_url_https?: string };
type XPost = {
  text?: string;
  user?: { name?: string; screen_name?: string };
  mediaDetails?: XMedia[];
  photos?: { url?: string }[];
  video?: { poster?: string };
  article?: { title?: string; preview_text?: string; cover_media?: { media_info?: { original_img_url?: string } } };
  quoted_tweet?: XPost;
  card?: { binding_values?: Record<string, { string_value?: string; image_value?: { url?: string } }> };
};

const withoutTcoLinks = (text: string | undefined) => clean(text?.replace(/https:\/\/t\.co\/\S+/g, ''));

function xPicture(post: XPost | undefined): string | undefined {
  if (!post) return undefined;
  const card = post.card?.binding_values;
  return (
    post.mediaDetails?.[0]?.media_url_https ??
    post.photos?.[0]?.url ??
    post.video?.poster ??
    post.article?.cover_media?.media_info?.original_img_url ??
    card?.thumbnail_image_large?.image_value?.url ??
    card?.photo_image_full_size_large?.image_value?.url
  );
}

async function fromXPost(url: string): Promise<LinkMetadata> {
  const id = /(?:x|twitter)\.com\/[^/?#]+\/status\/(\d+)/i.exec(url)?.[1];
  if (!id) return {};
  const res = await fetchWithTimeout(
    `https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${xSyndicationToken(id)}`,
    'application/json',
  );
  if (!res) return {};
  try {
    const post = (await res.json()) as XPost;
    const card = post.card?.binding_values;
    const quoted = post.quoted_tweet;
    const lines = [
      withoutTcoLinks(post.text),
      post.article?.title ? `X Article: ${clean(post.article.title)}` : undefined,
      post.article?.preview_text ? `Article opening: ${clean(post.article.preview_text)}` : undefined,
      card?.title?.string_value ? `Linked page: ${clean(card.title.string_value)}` : undefined,
      card?.description?.string_value ? `Linked page says: ${clean(card.description.string_value)}` : undefined,
      quoted
        ? `Quoting @${quoted.user?.screen_name ?? 'someone'}: ${withoutTcoLinks(quoted.text) ?? quoted.article?.title ?? ''}`
        : undefined,
    ].filter(Boolean);
    return {
      title: post.article?.title ? clean(post.article.title) : undefined,
      description: lines.length ? lines.join('\n') : undefined,
      author: clean(post.user?.name),
      siteName: 'X',
      imageUrl: xPicture(post) ?? xPicture(quoted),
      handle: post.user?.screen_name ? `@${post.user.screen_name}` : undefined,
    };
  } catch {
    return {};
  }
}

// Handles from the platforms' own public data: oEmbed author fields, or the post's address.
function handleFrom(
  source: string,
  url: string,
  oembed: { author_name?: string; author_url?: string; author_unique_id?: string },
): string | undefined {
  switch (source) {
    case 'tiktok':
      return oembed.author_unique_id ? `@${oembed.author_unique_id}` : undefined;
    case 'youtube': {
      const at = /youtube\.com\/(@[^/?#]+)/i.exec(oembed.author_url ?? '')?.[1];
      return at ? decodeURIComponent(at) : clean(oembed.author_name);
    }
    case 'x': {
      const name = /(?:x|twitter)\.com\/([^/?#]+)/i.exec(oembed.author_url ?? '')?.[1];
      return name ? `@${name}` : undefined;
    }
    case 'reddit':
      return oembed.author_name ? `u/${oembed.author_name}` : undefined;
    case 'threads': {
      const at = /threads\.(?:net|com)\/(@[^/?#]+)/i.exec(url)?.[1];
      return at ?? undefined;
    }
    default:
      return undefined;
  }
}

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
  const t = text
    ? decodeEntities(text.replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim()
    : '';
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
  const res = await fetchWithTimeout(endpoint(source === 'x' ? canonicalXUrl(url) : url), 'application/json');
  if (!res) return {};
  try {
    const data = await res.json();
    // X returns the post text only inside its embed HTML.
    // A post with only media has just a pic.twitter.com link as its text; drop it.
    const text =
      source === 'x'
        ? clean(/<p[^>]*>([\s\S]*?)<\/p>/i.exec(data.html ?? '')?.[1]?.replace(/pic\.twitter\.com\/\S+/g, ''))
        : undefined;
    return {
      title: clean(data.title),
      description: text,
      author: clean(data.author_name),
      siteName: clean(data.provider_name),
      imageUrl: data.thumbnail_url,
      handle: handleFrom(source, url, data),
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
  const caption = clean(
    captionHtml.replace(/<a class="CaptionUsername"[\s\S]*?<\/a>/i, '').replace(/<br\s*\/?>/gi, '\n'),
  );
  const image = /class="EmbeddedMediaImage"[^>]*src="([^"]+)"/i.exec(html)?.[1];
  return {
    title: kind === 'reel' ? 'Instagram reel' : 'Instagram post',
    description: caption,
    author: author ? `@${author}` : undefined,
    handle: author ? `@${author}` : undefined,
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

// Pinterest has no oEmbed in the list above (the page itself has the picture); its oEmbed is read only for the
// pinner's name.
async function pinterestHandle(url: string): Promise<string | undefined> {
  const res = await fetchWithTimeout(
    `https://www.pinterest.com/oembed.json?url=${encodeURIComponent(url)}`,
    'application/json',
  );
  if (!res) return undefined;
  try {
    return clean((await res.json()).author_name);
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
  if (source === 'x') {
    const post = await fromXPost(url);
    if (post.description || post.imageUrl || post.handle) return { ...post, imageUrl: absolutize(post.imageUrl, url) };
  }
  const [oembed, page, pinner] = await Promise.all([
    fromOEmbed(source, url),
    // oEmbed already covers these fully; skip the heavier page fetch.
    source in OEMBED && source !== 'reddit' ? Promise.resolve({} as LinkMetadata) : fromPage(url),
    source === 'pinterest' ? pinterestHandle(url) : Promise.resolve(undefined),
  ]);
  const merged: LinkMetadata = {
    title: oembed.title ?? page.title,
    description: oembed.description ?? page.description,
    author: oembed.author ?? page.author,
    siteName: oembed.siteName ?? page.siteName,
    imageUrl: oembed.imageUrl ?? page.imageUrl,
    handle: oembed.handle ?? pinner ?? handleFrom(source, url, {}),
  };
  merged.imageUrl = absolutize(merged.imageUrl, url);
  return merged;
}
