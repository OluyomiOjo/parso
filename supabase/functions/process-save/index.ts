// Called by the database trigger on every new save (see migration 0005). Replies straight away and
// processes in the background, so the trigger's HTTP call never waits on the AI.
import {
  admin,
  embedMissing,
  getConfig,
  processSave,
  secretMatches,
  storeEmbedding,
  thumbnailMissing,
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
  try {
    ({
      save_id: saveId,
      embed_missing: embedMissingOnly,
      embed_save: embedSaveId,
      thumbnail_missing: thumbnailsOnly,
    } = await req.json());
  } catch {
    return new Response('Bad request', { status: 400 });
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
  // After a person edits tags, note or collection (trigger in migration 0011): refresh that save's search
  // data only. The AI does not run again.
  if (typeof embedSaveId === 'string') {
    EdgeRuntime.waitUntil(
      storeEmbedding(db, embedSaveId).catch((error) => console.error('re-embed failed', embedSaveId, error)),
    );
    return Response.json({ accepted: embedSaveId }, { status: 202 });
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
