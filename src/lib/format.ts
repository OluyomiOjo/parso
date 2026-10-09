import { displayHost, type Source } from './links';

const SOURCE_LABELS: Record<Exclude<Source, 'other'>, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  x: 'X',
  threads: 'Threads',
  youtube: 'YouTube',
  facebook: 'Facebook',
  pinterest: 'Pinterest',
  linkedin: 'LinkedIn',
  reddit: 'Reddit',
  spotify: 'Spotify',
  safari: 'Safari',
  whatsapp: 'WhatsApp',
  vimeo: 'Vimeo',
  bluesky: 'Bluesky',
  tumblr: 'Tumblr',
  soundcloud: 'SoundCloud',
  twitch: 'Twitch',
  snapchat: 'Snapchat',
};

export function sourceLabel(source: string, url: string | null): string {
  if (source in SOURCE_LABELS) return SOURCE_LABELS[source as keyof typeof SOURCE_LABELS];
  return (url && displayHost(url)) || 'Link';
}

// The fixed button on the detail page: the platform's own app for platform links, the browser for websites.
// Photos, screenshots and notes have no link to open.
export function openLabel(kind: string, source: string, url: string | null): string | null {
  if (kind !== 'link' || !url) return null;
  return source in SOURCE_LABELS && source !== 'safari'
    ? `Open in ${SOURCE_LABELS[source as keyof typeof SOURCE_LABELS]}`
    : 'Open in browser';
}

const KIND_LABELS: Record<string, string> = { screenshot: 'Screenshot', image: 'Photo', text: 'Note' };

// What a save is, for meta lines: the platform for links, otherwise the kind of thing shared.
export function itemLabel(kind: string, source: string, url: string | null): string {
  return KIND_LABELS[kind] ?? sourceLabel(source, url);
}

// The meta line's leading label: the poster's @handle for social posts when Parso knows it (the brand icon
// beside it already says which platform), otherwise the platform, site or kind. Owner request, step 10.
export function metaLabel(save: { kind: string; source: string; url: string | null; author_handle?: string | null }) {
  return save.kind === 'link' && save.author_handle ? save.author_handle : itemLabel(save.kind, save.source, save.url);
}

export const saveCount = (n: number) => `${n} ${n === 1 ? 'save' : 'saves'}`;

// The collection filter's segments, in this order, shown only for kinds the collection has.
export const KIND_FILTERS = [
  { kind: 'link', label: 'Links' },
  { kind: 'image', label: 'Photos' },
  { kind: 'screenshot', label: 'Screens' },
  { kind: 'text', label: 'Notes' },
] as const;

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'} ago`;

// Hand-written: Hermes's Intl date support varies by build.
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diff = now.getTime() - then.getTime();
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return plural(Math.floor(diff / MINUTE), 'minute');
  if (diff < DAY) return plural(Math.floor(diff / HOUR), 'hour');
  const days = Math.floor(diff / DAY);
  if (days === 1) return 'yesterday';
  if (days < 7) return plural(days, 'day');
  if (days < 30) return plural(Math.floor(days / 7), 'week');
  const sameYear = then.getFullYear() === now.getFullYear();
  return `${MONTHS[then.getMonth()]} ${then.getDate()}${sameYear ? '' : `, ${then.getFullYear()}`}`;
}
