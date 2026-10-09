export type Source =
  | 'instagram'
  | 'tiktok'
  | 'x'
  | 'threads'
  | 'youtube'
  | 'facebook'
  | 'pinterest'
  | 'linkedin'
  | 'reddit'
  | 'spotify'
  | 'safari'
  | 'whatsapp'
  | 'vimeo'
  | 'bluesky'
  | 'tumblr'
  | 'soundcloud'
  | 'twitch'
  | 'snapchat'
  | 'other';

// Hosts (and their subdomains) that map to a known source.
const SOURCE_HOSTS: [Source, string[]][] = [
  ['instagram', ['instagram.com', 'instagr.am']],
  ['tiktok', ['tiktok.com']],
  ['x', ['x.com', 'twitter.com', 't.co']],
  ['threads', ['threads.net', 'threads.com']],
  ['youtube', ['youtube.com', 'youtu.be']],
  ['facebook', ['facebook.com', 'fb.com', 'fb.watch']],
  ['pinterest', ['pinterest.com', 'pinterest.co.uk', 'pinterest.ca', 'pinterest.com.au', 'pin.it']],
  ['linkedin', ['linkedin.com', 'lnkd.in']],
  ['reddit', ['reddit.com', 'redd.it']],
  ['spotify', ['spotify.com', 'spotify.link']],
  ['whatsapp', ['whatsapp.com', 'wa.me']],
  ['vimeo', ['vimeo.com']],
  ['bluesky', ['bsky.app']],
  ['tumblr', ['tumblr.com']],
  ['soundcloud', ['soundcloud.com', 'on.soundcloud.com']],
  ['twitch', ['twitch.tv']],
  ['snapchat', ['snapchat.com']],
];

// scheme://host[:port]/rest. Parsed by hand because React Native's URL object is incomplete.
const URL_PATTERN = /^(https?):\/\/([^/?#:\s]+)(:\d+)?([/?#][^\s]*)?$/i;
// A real host has labels separated by dots and a top-level part of at least two letters.
const HOST_PATTERN = /^([a-z0-9-]+\.)+[a-z]{2,}$/i;

// Turns pasted text into a clean http(s) URL, or null when it isn't a web address.
export function normalizeUrl(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const withScheme = hasScheme ? trimmed : `https://${trimmed}`;
  const match = URL_PATTERN.exec(withScheme);
  if (!match || !HOST_PATTERN.test(match[2])) return null;
  const [, scheme, host, port = '', rest = '/'] = match;
  return `${scheme.toLowerCase()}://${host.toLowerCase()}${port}${rest}`;
}

function hostOf(url: string): string {
  const match = URL_PATTERN.exec(url);
  return match ? match[2].toLowerCase().replace(/^www\./, '') : '';
}

export function detectSource(url: string): Source {
  const host = hostOf(url);
  for (const [source, hosts] of SOURCE_HOSTS) {
    if (hosts.some((h) => host === h || host.endsWith(`.${h}`))) return source;
  }
  return 'other';
}

// Short form used as the title until processing gives a real one.
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
}

export function displayHost(url: string): string {
  return hostOf(url);
}
