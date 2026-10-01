// Called by the database trigger on every new save (see migration 0005). Replies straight away and
// processes in the background, so the trigger's HTTP call never waits on the AI.
import { admin, getConfig, processSave, secretMatches } from '../_shared/pipeline.ts';

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
  try {
    ({ save_id: saveId } = await req.json());
  } catch {
    return new Response('Bad request', { status: 400 });
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
