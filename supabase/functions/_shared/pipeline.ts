import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { describeSave, type DescribeResult, type Provider } from './ai.ts';
import { downloadImage, extensionFor, type ImageData } from './image.ts';
import { fetchLinkMetadata } from './metadata.ts';

export type Save = {
  id: string;
  user_id: string;
  kind: string;
  source: string;
  url: string | null;
  raw_text: string | null;
  processed_at: string | null;
};

const PLATFORM_NAMES: Record<string, string> = {
  instagram: 'Instagram', tiktok: 'TikTok', x: 'X', threads: 'Threads', youtube: 'YouTube',
  facebook: 'Facebook', pinterest: 'Pinterest', linkedin: 'LinkedIn', reddit: 'Reddit',
  spotify: 'Spotify', safari: 'Safari', whatsapp: 'WhatsApp', other: 'Website',
};

// Service-role client: bypasses RLS, so every query below filters by the save's own user_id.
export const admin = (): SupabaseClient =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

export async function getConfig(db: SupabaseClient): Promise<{ secret: string; aiProvider: Provider }> {
  const { data, error } = await db.rpc('get_processing_config').single<{ secret: string; ai_provider: string }>();
  if (error || !data) throw new Error(`Config unavailable: ${error?.message}`);
  return { secret: data.secret, aiProvider: 'openai' };
}

// Same host list as the app's src/lib/links.ts. Re-checked here so links saved by an older app build,
// or short links the app can't recognise, still get the right platform.
const SOURCE_HOSTS: [string, string[]][] = [
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
];

export function detectSource(url: string): string {
  const host = /^https?:\/\/([^/?#:]+)/i.exec(url)?.[1]?.toLowerCase().replace(/^www\./, '') ?? '';
  for (const [source, hosts] of SOURCE_HOSTS) {
    if (hosts.some((h) => host === h || host.endsWith(`.${h}`))) return source;
  }
  return 'other';
}

// Constant-time comparison so the secret can't be guessed from response timing.
export function secretMatches(given: string | null, expected: string): boolean {
  if (!given || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export type PreparedSave = { text: string; image: ImageData | null; collections: string[] };

export async function prepare(db: SupabaseClient, save: Save): Promise<PreparedSave> {
  const meta = save.url ? await fetchLinkMetadata(save.url, save.source) : {};
  const image = meta.imageUrl ? await downloadImage(meta.imageUrl) : null;
  const lines = [
    save.url ? `Link: ${save.url}` : null,
    `Platform: ${PLATFORM_NAMES[save.source] ?? 'Website'}`,
    meta.siteName ? `Site: ${meta.siteName}` : null,
    meta.author ? `Author: ${meta.author}` : null,
    meta.title ? `Page title: ${meta.title}` : null,
    meta.description ? `Description: ${meta.description.slice(0, 1500)}` : null,
    save.raw_text ? `Text shared with it: ${save.raw_text.slice(0, 1500)}` : null,
    image ? 'A preview image is attached.' : 'No preview image.',
  ].filter(Boolean);

  const { data } = await db.from('collections').select('name').eq('user_id', save.user_id).order('created_at');
  return { text: lines.join('\n'), image, collections: (data ?? []).map((c) => c.name) };
}

export async function logRun(
  db: SupabaseClient,
  save: Save,
  purpose: 'live' | 'compare',
  provider: Provider,
  result: DescribeResult | null,
  error: unknown,
  prepared?: PreparedSave,
) {
  await db.from('ai_runs').insert({
    input_text: prepared?.text ?? null,
    had_image: prepared ? prepared.image !== null : null,
    save_id: save.id,
    user_id: save.user_id,
    purpose,
    provider,
    model: result?.model ?? provider,
    input_tokens: result?.inputTokens ?? null,
    output_tokens: result?.outputTokens ?? null,
    cost_usd: result?.costUsd ?? null,
    duration_ms: result?.durationMs ?? null,
    output: result?.output ?? null,
    error: error ? String(error instanceof Error ? error.message : error).slice(0, 500) : null,
  });
}

async function findOrCreateCollection(db: SupabaseClient, userId: string, name: string): Promise<string> {
  const { data: existing } = await db.from('collections').select('id, name').eq('user_id', userId);
  const match = existing?.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (match) return match.id;
  const { data, error } = await db.from('collections').insert({ user_id: userId, name }).select('id').single();
  if (data) return data.id;
  // Another save created the same collection a moment ago (unique on lower(name)): use that one.
  const { data: again } = await db.from('collections').select('id, name').eq('user_id', userId);
  const raced = again?.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (raced) return raced.id;
  throw new Error(`Couldn't create collection: ${error?.message}`);
}

async function storeThumbnail(db: SupabaseClient, save: Save, image: ImageData): Promise<string | null> {
  const path = `${save.user_id}/${save.id}.${extensionFor(image.mediaType)}`;
  const { error } = await db.storage
    .from('thumbnails')
    .upload(path, image.bytes, { contentType: image.mediaType, upsert: true });
  return error ? null : path;
}

export async function processSave(db: SupabaseClient, saveId: string, provider: Provider) {
  const { data: save } = await db
    .from('saves')
    .select('id, user_id, kind, source, url, raw_text, processed_at')
    .eq('id', saveId)
    .single<Save>();
  if (!save || save.processed_at) return;
  if (save.source === 'other' && save.url) save.source = detectSource(save.url);

  const prepared = await prepare(db, save);
  let result: DescribeResult | null = null;
  try {
    result = await describeSave(provider, prepared);
  } catch (error) {
    await logRun(db, save, 'live', provider, null, error, prepared);
    return; // the save keeps its URL title; nothing else changes
  }
  await logRun(db, save, 'live', provider, result, null, prepared);

  const collectionId = await findOrCreateCollection(db, save.user_id, result.output.collection);
  const thumbnailPath = prepared.image ? await storeThumbnail(db, save, prepared.image) : null;
  const { title, snippet, summary, tags } = result.output;
  await db
    .from('saves')
    .update({
      source: save.source,
      title,
      snippet,
      summary,
      tags,
      collection_id: collectionId,
      ...(thumbnailPath ? { thumbnail_path: thumbnailPath } : {}),
      processed_at: new Date().toISOString(),
    })
    .eq('id', save.id)
    .eq('user_id', save.user_id);
}
