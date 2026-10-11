// Called by the database trigger on every new save (see migration 0005). Replies straight away and
// processes in the background, so the trigger's HTTP call never waits on the AI.
import {
  admin,
  deleteFiles,
  embedMissing,
  handlesMissing,
  orphanFiles,
  noteSave,
  redescribe,
  getConfig,
  processSave,
  secretMatches,
  storeEmbedding,
  thumbnailMissing,
  thumbnailSave,
  thumbnailSizes,
} from '../_shared/pipeline.ts';

// Provided by the Supabase Edge Runtime: keeps the worker alive until the promise settles.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const db = admin();
  const { secret, aiProvider } = await getConfig(db);
  if (!secretMatches(req.headers.get('x-parso-secret'), secret)) {
    return new Response('Unauthorized', { status: 401 });
  }

  let saveId: unknown;
  let embedMissingOnly: unknown;
  let embedSaveId: unknown;
  let thumbnailsOnly: unknown;
  let thumbnailSaveId: unknown;
  let sizesOnly: unknown;
  let handlesOnly: unknown;
  let redescribeIds: unknown;
  let noteSaveId: unknown;
  let noteEditedAt: unknown;
  let filesToDelete: unknown;
  let orphanFilesOnly: unknown;
  try {
    ({
      save_id: saveId,
      embed_missing: embedMissingOnly,
      embed_save: embedSaveId,
      thumbnail_missing: thumbnailsOnly,
      thumbnail_save: thumbnailSaveId,
      thumbnail_sizes: sizesOnly,
      handles_missing: handlesOnly,
      redescribe: redescribeIds,
      note_save: noteSaveId,
      edited_at: noteEditedAt,
      delete_files: filesToDelete,
      orphan_files: orphanFilesOnly,
    } = await req.json());
  } catch {
    return new Response('Bad request', { status: 400 });
  }
  // A save was deleted (trigger in migration 0029): remove its picture and uploaded photo from storage.
  if (filesToDelete && typeof filesToDelete === 'object') {
    EdgeRuntime.waitUntil(
      deleteFiles(db, filesToDelete as { thumbnails?: unknown; uploads?: unknown }).catch((error) =>
        console.error('delete files failed', error),
      ),
    );
    return Response.json({ accepted: true }, { status: 202 });
  }
  // One-off: remove files left behind by saves deleted earlier. "preview" only counts them.
  if (orphanFilesOnly === true || orphanFilesOnly === 'preview') {
    return Response.json(await orphanFiles(db, orphanFilesOnly === 'preview'));
  }
  // One-off backfill for search: adds embeddings to filed saves that have none.
  if (embedMissingOnly === true) {
    const count = await embedMissing(db);
    return Response.json({ embedded: count });
  }
  // One-off backfill: pictures for filed link saves that have none. The AI does not run.
  if (thumbnailsOnly === true) {
    const added = await thumbnailMissing(db);
    return Response.json({ added });
  }
  // One-off backfill: the size of thumbnails stored before sizes were kept (for the grid view).
  if (sizesOnly === true) {
    const sized = await thumbnailSizes(db);
    return Response.json({ sized });
  }
  // One-off backfill: posters' handles for social saves filed before handles were kept. The AI does not run.
  if (handlesOnly === true) {
    const added = await handlesMissing(db);
    return Response.json({ added });
  }
  // Owner-approved one-off: describe the listed saves again, keeping their collections.
  if (Array.isArray(redescribeIds) && redescribeIds.every((x) => typeof x === 'string') && redescribeIds.length <= 25) {
    const results = await redescribe(db, redescribeIds as string[], aiProvider);
    return Response.json({ results });
  }
  // After a person edits tags, note or collection (trigger in migration 0011): refresh that save's search
  // data only. The AI does not run again.
  if (typeof embedSaveId === 'string') {
    EdgeRuntime.waitUntil(
      storeEmbedding(db, embedSaveId).catch((error) => console.error('re-embed failed', embedSaveId, error)),
    );
    return Response.json({ accepted: embedSaveId }, { status: 202 });
  }
  // A note was written or edited (triggers in migrations 0018 and 0019): file it, or refresh its search data,
  // once typing stops.
  if (typeof noteSaveId === 'string' && typeof noteEditedAt === 'string') {
    EdgeRuntime.waitUntil(
      noteSave(db, noteSaveId, noteEditedAt, aiProvider).catch((error) =>
        console.error('note-save failed', noteSaveId, error),
      ),
    );
    return Response.json({ accepted: noteSaveId }, { status: 202 });
  }
  // After the phone found a page's preview picture (trigger in migration 0013): store it as the thumbnail.
  if (typeof thumbnailSaveId === 'string') {
    EdgeRuntime.waitUntil(
      thumbnailSave(db, thumbnailSaveId).catch((error) => console.error('thumbnail failed', thumbnailSaveId, error)),
    );
    return Response.json({ accepted: thumbnailSaveId }, { status: 202 });
  }
  if (typeof saveId !== 'string') return new Response('Bad request', { status: 400 });

  EdgeRuntime.waitUntil(
    processSave(db, saveId, aiProvider).catch((error) => console.error('process-save failed', saveId, error)),
  );
  return new Response(JSON.stringify({ accepted: saveId }), {
    status: 202,
    headers: { 'Content-Type': 'application/json' },
  });
});
