import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { describeSave, type DescribeResult, type Provider } from './ai.ts';
import { embed, toVector } from './embeddings.ts';
import { downloadImage, extensionFor, type ImageData } from './image.ts';
import { fetchLinkMetadata } from './metadata.ts';
import { PLATFORM_NAMES } from './sources.ts';

export type Save = {
  id: string;
  user_id: string;
  kind: string;
  source: string;
  url: string | null;
  raw_text: string | null;
  preview_image_url: string | null;
  processed_at: string | null;
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

const IMAGE_KINDS = new Set(['image', 'screenshot']);

// Photos and screenshots shared into Parso: the app uploads them to uploads/<user_id>/<save_id>.jpg
// before inserting the save, so the file is there when this runs.
async function downloadUpload(db: SupabaseClient, save: Save): Promise<ImageData | null> {
  const { data, error } = await db.storage.from('uploads').download(`${save.user_id}/${save.id}.jpg`);
  if (error || !data) return null;
  return { bytes: new Uint8Array(await data.arrayBuffer()), mediaType: 'image/jpeg' };
}

// The page's own preview image, or else the one the phone found when sharing from Safari.
async function linkImage(pageImage: string | undefined, sharedImage: string | null): Promise<ImageData | null> {
  return (pageImage ? await downloadImage(pageImage) : null) ?? (sharedImage ? await downloadImage(sharedImage) : null);
}

export async function prepare(db: SupabaseClient, save: Save): Promise<PreparedSave> {
  const isImage = IMAGE_KINDS.has(save.kind);
  const meta = save.url && !isImage ? await fetchLinkMetadata(save.url, save.source) : {};
  const image = isImage ? await downloadUpload(db, save) : await linkImage(meta.imageUrl, save.preview_image_url);
  const lines = [
    isImage ? `Shared item: a ${save.kind === 'screenshot' ? 'screenshot' : 'photo'} from the phone` : null,
    save.url ? `Link: ${save.url}` : null,
    isImage ? null : `Platform: ${PLATFORM_NAMES[save.source] ?? 'Website'}`,
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

type CollectionRef = { id: string; description: string | null };

async function findOrCreateCollection(db: SupabaseClient, userId: string, name: string): Promise<CollectionRef> {
  const find = async () => {
    const { data } = await db.from('collections').select('id, name, description').eq('user_id', userId);
    return data?.find((c) => c.name.toLowerCase() === name.toLowerCase());
  };
  const existing = await find();
  if (existing) return existing;
  const { data, error } = await db.from('collections').insert({ user_id: userId, name }).select('id, description').single();
  if (data) return data;
  // Another save created the same collection a moment ago (unique on lower(name)): use that one.
  const raced = await find();
  if (raced) return raced;
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
    .select('id, user_id, kind, source, url, raw_text, preview_image_url, processed_at')
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

  const collection = await findOrCreateCollection(db, save.user_id, result.output.collection);
  // Written once; a description the person already has (or one from an earlier save) is kept.
  if (!collection.description && result.output.collection_description) {
    await db
      .from('collections')
      .update({ description: result.output.collection_description })
      .eq('id', collection.id)
      .eq('user_id', save.user_id)
      .is('description', null);
  }
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
      collection_id: collection.id,
      ...(thumbnailPath ? { thumbnail_path: thumbnailPath } : {}),
      processed_at: new Date().toISOString(),
    })
    .eq('id', save.id)
    .eq('user_id', save.user_id);

  await storeEmbedding(db, save.id, save.user_id).catch((error) => console.error('embedding failed', save.id, error));
}

type EmbeddableSave = {
  id: string;
  user_id: string;
  kind: string;
  source: string;
  title: string | null;
  snippet: string | null;
  summary: string | null;
  tags: string[];
  note: string | null;
  raw_text: string | null;
  collections: { name: string } | null;
};

const EMBED_COLUMNS = 'id, user_id, kind, source, title, snippet, summary, tags, note, raw_text, collections(name)';

// Everything a person might search for, as one text: what it is, where it came from and where it's filed.
function embeddingText(save: EmbeddableSave): string {
  const from = save.kind === 'link' ? PLATFORM_NAMES[save.source] ?? 'Website' : save.kind;
  return [
    save.title,
    save.snippet,
    save.summary,
    save.tags.length ? `Tags: ${save.tags.join(', ')}` : null,
    `From: ${from}`,
    save.collections ? `Collection: ${save.collections.name}` : null,
    save.note ? `Note: ${save.note}` : null,
    save.raw_text,
  ]
    .filter(Boolean)
    .join('\n');
}

async function writeEmbeddings(db: SupabaseClient, saves: EmbeddableSave[]) {
  if (!saves.length) return;
  const vectors = await embed(saves.map(embeddingText));
  for (const [i, save] of saves.entries()) {
    await db.from('saves').update({ embedding: toVector(vectors[i]) }).eq('id', save.id).eq('user_id', save.user_id);
  }
}

export async function storeEmbedding(db: SupabaseClient, saveId: string, userId?: string) {
  let query = db.from('saves').select(EMBED_COLUMNS).eq('id', saveId);
  if (userId) query = query.eq('user_id', userId);
  const { data } = await query.single();
  if (data) await writeEmbeddings(db, [data as unknown as EmbeddableSave]);
}

// Backfill: embeds filed saves that have none. Never re-runs the AI, so nothing is re-filed.
export async function embedMissing(db: SupabaseClient): Promise<number> {
  const { data, error } = await db
    .from('saves')
    .select(EMBED_COLUMNS)
    .not('processed_at', 'is', null)
    .is('embedding', null)
    .limit(100);
  if (error) throw error;
  await writeEmbeddings(db, (data ?? []) as unknown as EmbeddableSave[]);
  return data?.length ?? 0;
}

// Backfill: adds a picture to filed link saves that have none (for example X posts saved before X pictures
// were read). Only the picture is fetched and stored; nothing else about the save changes.
export async function thumbnailMissing(db: SupabaseClient): Promise<number> {
  const { data, error } = await db
    .from('saves')
    .select('id, user_id, kind, source, url, raw_text, preview_image_url, processed_at')
    .eq('kind', 'link')
    .not('processed_at', 'is', null)
    .is('thumbnail_path', null)
    .limit(50);
  if (error) throw error;
  let added = 0;
  for (const save of (data ?? []) as Save[]) {
    if (!save.url) continue;
    const meta = await fetchLinkMetadata(save.url, save.source);
    const image = await linkImage(meta.imageUrl, save.preview_image_url);
    const path = image ? await storeThumbnail(db, save, image) : null;
    if (!path) continue;
    await db.from('saves').update({ thumbnail_path: path }).eq('id', save.id).eq('user_id', save.user_id);
    added++;
  }
  return added;
}
