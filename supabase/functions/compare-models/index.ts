// Temporary: runs Claude and OpenAI on the same saves and logs both to ai_runs (purpose 'compare')
// so the owner can pick a provider. Does not change any save. Removed once the provider is chosen.
import { describeSave, type Provider } from '../_shared/ai.ts';
import { admin, getConfig, logRun, prepare, secretMatches, type Save } from '../_shared/pipeline.ts';

const PROVIDERS: Provider[] = ['anthropic', 'openai'];
const MAX_SAVES = 30;

// Provided by the Supabase Edge Runtime: keeps the worker alive until the promise settles.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const db = admin();
  const { secret } = await getConfig(db);
  if (!secretMatches(req.headers.get('x-parso-secret'), secret)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { data: saves } = await db
    .from('saves')
    .select('id, user_id, kind, source, url, raw_text, processed_at')
    .order('created_at', { ascending: true })
    .limit(MAX_SAVES)
    .returns<Save[]>();

  // Each model builds up its own collection list over the run, as it would for real, so reusing
  // collection names is part of what gets compared.
  const chosen: Record<Provider, string[]> = { anthropic: [], openai: [] };

  const run = async () => {
    for (const save of saves ?? []) {
      // Same fetched input for both models, so the comparison is fair.
      const prepared = await prepare(db, save);
      await Promise.all(
        PROVIDERS.map(async (provider) => {
          try {
            const result = await describeSave(provider, { ...prepared, collections: chosen[provider] });
            const name = result.output.collection;
            if (!chosen[provider].some((c) => c.toLowerCase() === name.toLowerCase())) chosen[provider].push(name);
            await logRun(db, save, 'compare', provider, result, null, prepared);
          } catch (error) {
            await logRun(db, save, 'compare', provider, null, error, prepared);
          }
        }),
      );
    }
  };
  EdgeRuntime.waitUntil(run().catch((error) => console.error('compare-models failed', error)));
  return new Response(JSON.stringify({ accepted: saves?.length ?? 0 }), {
    status: 202,
    headers: { 'Content-Type': 'application/json' },
  });
});
