import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { describeSave, writeNextSteps, type DescribeResult, type Provider } from './ai.ts';
import { embed, toVector } from './embeddings.ts';
import { downloadImage, extensionFor, imageSize, type ImageData } from './image.ts';
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
  edited_at?: string | null;
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
  const host =
    /^https?:\/\/([^/?#:]+)/i
      .exec(url)?.[1]
      ?.toLowerCase()
      .replace(/^www\./, '') ?? '';
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

export type PreparedSave = { text: string; image: ImageData | null; collections: string[]; handle: string | null };

const IMAGE_KINDS = new Set(['image', 'screenshot']);
const NOTE_TEXT_MAX = 4000;
// Written in the note editor: its first line is the title and the person's own words are never replaced.
const isNote = (save: Save) => save.kind === 'text' && Boolean(save.edited_at);
const HANDLE_MAX = 80; // the database's limit (migration 0017)

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
    isImage || isNote(save) ? null : `Platform: ${PLATFORM_NAMES[save.source] ?? 'Website'}`,
    meta.siteName ? `Site: ${meta.siteName}` : null,
    meta.author ? `Author: ${meta.author}` : null,
    meta.handle && meta.handle !== meta.author ? `Account: ${meta.handle}` : null,
    meta.title ? `Page title: ${meta.title}` : null,
    meta.description ? `Description: ${meta.description.slice(0, 1500)}` : null,
    isNote(save)
      ? `The person's own note: ${save.raw_text?.slice(0, NOTE_TEXT_MAX) ?? ''}`
      : save.raw_text
        ? `Text shared with it: ${save.raw_text.slice(0, 1500)}`
        : null,
    image ? 'A preview image is attached.' : 'No preview image.',
  ].filter(Boolean);

  const { data } = await db.from('collections').select('name').eq('user_id', save.user_id).order('created_at');
  return {
    text: lines.join('\n'),
    image,
    collections: (data ?? []).map((c) => c.name),
    handle: meta.handle?.slice(0, HANDLE_MAX) ?? null,
  };
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
  const { data, error } = await db
    .from('collections')
    .insert({ user_id: userId, name })
    .select('id, description')
    .single();
  if (data) return data;
  // Another save created the same collection a moment ago (unique on lower(name)): use that one.
  const raced = await find();
  if (raced) return raced;
  throw new Error(`Couldn't create collection: ${error?.message}`);
}

type ThumbnailColumns = { thumbnail_path: string; thumbnail_width: number | null; thumbnail_height: number | null };

// Stores the picture and returns the columns to write with it. The size lets the app's grid lay the
// picture out at its real shape before it loads.
async function storeThumbnail(db: SupabaseClient, save: Save, image: ImageData): Promise<ThumbnailColumns | null> {
  const path = `${save.user_id}/${save.id}.${extensionFor(image.mediaType)}`;
  const { error } = await db.storage
    .from('thumbnails')
    .upload(path, image.bytes, { contentType: image.mediaType, upsert: true });
  if (error) return null;
  const size = imageSize(image.bytes);
  return { thumbnail_path: path, thumbnail_width: size?.width ?? null, thumbnail_height: size?.height ?? null };
}

export async function processSave(db: SupabaseClient, saveId: string, provider: Provider) {
  const { data: save } = await db
    .from('saves')
    .select('id, user_id, kind, source, url, raw_text, preview_image_url, processed_at, edited_at')
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
  const thumbnail = prepared.image ? await storeThumbnail(db, save, prepared.image) : null;
  const { title, snippet, summary, tags, next_step } = result.output;
  await db
    .from('saves')
    .update({
      source: save.source,
      next_step, // "" when there's nothing to ask: asked once, never again
      ...(isNote(save) ? {} : { title, snippet }), // a note's title and snippet come from its own lines
      summary,
      tags,
      collection_id: collection.id,
      author_handle: prepared.handle,
      ...(thumbnail ?? {}),
      processed_at: new Date().toISOString(),
    })
    .eq('id', save.id)
    .eq('user_id', save.user_id);

  await storeEmbedding(db, save.id, save.user_id).catch((error) => console.error('embedding failed', save.id, error));
}

const NOTE_QUIET_MS = 4000; // filed once the person has stopped typing for this long
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Every edit to a note (triggers in migrations 0018 and 0019) calls this with that edit's time. It waits, then
// acts only if no newer edit came in meanwhile, so a burst of typing ends in one AI run (the first time) or one
// search refresh (after).
export async function noteSave(db: SupabaseClient, saveId: string, editedAt: string, provider: Provider) {
  await sleep(NOTE_QUIET_MS);
  const { data } = await db
    .from('saves')
    .select('id, kind, edited_at, processed_at')
    .eq('id', saveId)
    .maybeSingle<{ id: string; kind: string; edited_at: string | null; processed_at: string | null }>();
  if (!data || data.kind !== 'text' || !data.edited_at) return;
  if (new Date(data.edited_at).getTime() !== new Date(editedAt).getTime()) return; // a newer edit has its own call
  if (data.processed_at) await storeEmbedding(db, saveId);
  else await processSave(db, saveId, provider);
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
  const from = save.kind === 'link' ? (PLATFORM_NAMES[save.source] ?? 'Website') : save.kind;
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
    await db
      .from('saves')
      .update({ embedding: toVector(vectors[i]) })
      .eq('id', save.id)
      .eq('user_id', save.user_id);
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

// Fetches and stores a picture for one filed link save that has none. The AI does not run.
async function addThumbnail(db: SupabaseClient, save: Save): Promise<boolean> {
  if (!save.url) return false;
  const meta = await fetchLinkMetadata(save.url, save.source);
  const image = await linkImage(meta.imageUrl, save.preview_image_url);
  const thumbnail = image ? await storeThumbnail(db, save, image) : null;
  if (!thumbnail) return false;
  await db.from('saves').update(thumbnail).eq('id', save.id).eq('user_id', save.user_id);
  return true;
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
  for (const save of (data ?? []) as Save[]) if (await addThumbnail(db, save)) added++;
  return added;
}

// After the phone found a page's preview picture (trigger in migration 0013).
export async function thumbnailSave(db: SupabaseClient, saveId: string): Promise<boolean> {
  const { data } = await db
    .from('saves')
    .select('id, user_id, kind, source, url, raw_text, preview_image_url, processed_at')
    .eq('id', saveId)
    .eq('kind', 'link')
    .is('thumbnail_path', null)
    .maybeSingle();
  return data ? addThumbnail(db, data as Save) : false;
}

// Backfill: records the size of thumbnails stored before sizes were kept. Only reads the stored file.
export async function thumbnailSizes(db: SupabaseClient): Promise<number> {
  const { data, error } = await db
    .from('saves')
    .select('id, user_id, thumbnail_path')
    .not('thumbnail_path', 'is', null)
    .is('thumbnail_width', null)
    .limit(200);
  if (error) throw error;
  let sized = 0;
  for (const save of data ?? []) {
    const { data: file } = await db.storage.from('thumbnails').download(save.thumbnail_path);
    const size = file ? imageSize(new Uint8Array(await file.arrayBuffer())) : null;
    if (!size) continue;
    await db
      .from('saves')
      .update({ thumbnail_width: size.width, thumbnail_height: size.height })
      .eq('id', save.id)
      .eq('user_id', save.user_id);
    sized++;
  }
  return sized;
}

const SOCIAL_SOURCES = ['instagram', 'tiktok', 'x', 'threads', 'youtube', 'pinterest', 'reddit'];

// Backfill: the poster's handle for filed social saves that have none. Reads public metadata only; the AI
// does not run and nothing else about the save changes.
export async function handlesMissing(db: SupabaseClient): Promise<number> {
  const { data, error } = await db
    .from('saves')
    .select('id, user_id, source, url')
    .eq('kind', 'link')
    .in('source', SOCIAL_SOURCES)
    .not('processed_at', 'is', null)
    .is('author_handle', null)
    .limit(40);
  if (error) throw error;
  let added = 0;
  for (const save of data ?? []) {
    if (!save.url) continue;
    const handle = (await fetchLinkMetadata(save.url, save.source)).handle?.slice(0, HANDLE_MAX);
    if (!handle) continue;
    await db.from('saves').update({ author_handle: handle }).eq('id', save.id).eq('user_id', save.user_id);
    added++;
  }
  return added;
}

// Owner-approved one-off: describe chosen saves again with today's metadata and instructions (for saves the
// AI misread when it had little to go on). Title, snippet, summary, tags, handle and picture are rewritten;
// the collection is kept, so nothing moves.
export async function redescribe(db: SupabaseClient, saveIds: string[], provider: Provider) {
  const results: { id: string; before: string | null; after: string | null; error?: string }[] = [];
  for (const id of saveIds) {
    const { data } = await db
      .from('saves')
      .select('id, user_id, kind, source, url, raw_text, preview_image_url, processed_at, title')
      .eq('id', id)
      .single<Save & { title: string | null }>();
    if (!data) continue;
    const prepared = await prepare(db, data);
    let result: DescribeResult | null = null;
    try {
      result = await describeSave(provider, prepared);
    } catch (error) {
      await logRun(db, data, 'live', provider, null, error, prepared);
      results.push({ id, before: data.title, after: null, error: String(error) });
      continue;
    }
    await logRun(db, data, 'live', provider, result, null, prepared);
    const thumbnail = prepared.image ? await storeThumbnail(db, data, prepared.image) : null;
    const { title, snippet, summary, tags, next_step } = result.output;
    await db
      .from('saves')
      .update({
        title,
        next_step,
        snippet,
        summary,
        tags,
        author_handle: prepared.handle,
        // An X post with no picture of its own drops the old profile-photo thumbnail.
        ...(thumbnail ??
          (data.source === 'x' ? { thumbnail_path: null, thumbnail_width: null, thumbnail_height: null } : {})),
      })
      .eq('id', id)
      .eq('user_id', data.user_id);
    await storeEmbedding(db, id, data.user_id).catch((e) => console.error('re-embed failed', id, e));
    results.push({ id, before: data.title, after: title });
  }
  return results;
}

// One-off for saves filed before questions existed (Your week in Parso): writes each one's question from what
// Parso already wrote about it. Nothing is fetched and nothing else changes. With dryRun it only returns them,
// so the owner can see a sample first.
export async function nextStepsMissing(db: SupabaseClient, dryRun: boolean) {
  const { data, error } = await db
    .from('saves')
    .select('id, user_id, kind, source, title, snippet, summary, tags')
    .not('processed_at', 'is', null)
    .is('next_step', null)
    .order('created_at', { ascending: false })
    .limit(dryRun ? 15 : 40);
  if (error) throw error;
  const saves = data ?? [];
  if (!saves.length) return { written: 0, costUsd: 0, sample: [] };
  const result = await writeNextSteps(
    saves.map((save) => ({
      id: save.id,
      text: [
        `Kind: ${save.kind}${save.kind === 'link' ? `, from ${PLATFORM_NAMES[save.source] ?? 'a website'}` : ''}`,
        save.title ? `Title: ${save.title}` : null,
        save.snippet ? `Detail: ${save.snippet}` : null,
        save.summary ? `Summary: ${save.summary}` : null,
        save.tags?.length ? `Tags: ${save.tags.join(', ')}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    })),
  );
  const sample = saves.map((save) => ({ title: save.title, next_step: result.steps.get(save.id) ?? null }));
  if (!dryRun) {
    for (const save of saves) {
      const step = result.steps.get(save.id);
      if (step === undefined) continue; // left for the next run
      await db.from('saves').update({ next_step: step }).eq('id', save.id).eq('user_id', save.user_id);
    }
  }
  return { written: dryRun ? 0 : sample.filter((s) => s.next_step !== null).length, costUsd: result.costUsd, sample };
}
