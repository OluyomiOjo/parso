import { displayHost, type Source } from './links';

const SOURCE_LABELS: Record<Exclude<Source, 'other'>, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  x: 'X',
  youtube: 'YouTube',
  facebook: 'Facebook',
  safari: 'Safari',
  whatsapp: 'WhatsApp',
};

export function sourceLabel(source: string, url: string | null): string {
  if (source in SOURCE_LABELS) return SOURCE_LABELS[source as keyof typeof SOURCE_LABELS];
  return (url && displayHost(url)) || 'Link';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
