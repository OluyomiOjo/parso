// Called by the database trigger on every new save (see migration 0005). Replies straight away and
// processes in the background, so the trigger's HTTP call never waits on the AI.
import { admin, embedMissing, getConfig, processSave, secretMatches } from '../_shared/pipeline.ts';

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
  try {
    ({ save_id: saveId, embed_missing: embedMissingOnly } = await req.json());
  } catch {
    return new Response('Bad request', { status: 400 });
  }
  // One-off backfill for search: adds embeddings to filed saves that have none.
  if (embedMissingOnly === true) {
    const count = await embedMissing(db);
    return Response.json({ embedded: count });
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
