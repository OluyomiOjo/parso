import { supabase } from './supabase';

export type Daily = { day: string; saves: number; new_users: number; active_users: number; searches: number };
export type Overview = {
  users: { total: number; new_today: number; new_7d: number; active_1d: number; active_7d: number; pro: number };
  saves: { total: number; today: number; searches_7d: number; reminders: number };
  daily: Daily[];
  sources: Record<string, number>;
  kinds: Record<string, number>;
  funnel: Record<'intro_finished' | 'signed_in' | 'first_save' | 'ten_saves' | 'fifty_saves' | 'pro', number>;
};
export type UserRow = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  last_active: string | null;
  saves: number;
  sources: string[];
  pro: boolean;
};
export type Costs = {
  total_usd: number;
  runs: number;
  per_save_usd: number;
  last_30d_usd: number;
  active_users_30d: number;
  daily: { day: string; usd: number; runs: number }[];
};

// Every request goes through admin-stats with the signed-in admin's session.
export async function adminStats<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('admin-stats', { body });
  if (error) {
    const message = await error.context?.json?.().then((b: { error?: string }) => b.error).catch(() => undefined);
    throw new Error(message ?? "Couldn't load this. Refresh to try again.");
  }
  return data as T;
}

export const FREE_LIMIT = 50;

export const SOURCE_NAMES: Record<string, string> = {
  instagram: 'Instagram', tiktok: 'TikTok', x: 'X', threads: 'Threads', youtube: 'YouTube',
  facebook: 'Facebook', pinterest: 'Pinterest', linkedin: 'LinkedIn', reddit: 'Reddit',
  spotify: 'Spotify', safari: 'Safari', whatsapp: 'WhatsApp', other: 'Websites',
};
export const KIND_NAMES: Record<string, string> = { link: 'Links', image: 'Photos', screenshot: 'Screenshots', text: 'Notes' };

export const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never';
export const usd = (n: number, digits = 2) => `$${n.toFixed(digits)}`;
