// Hybrid search over the signed-in person's saves. Runs with their own login (verify_jwt on), so the
// database's row security decides what they can see; the admin key is never used here.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { embed, toVector } from '../_shared/embeddings.ts';
import { findMatches, parseQuery, sourceLabel, type Match } from '../_shared/searchText.ts';

const KINDS = new Set(['link', 'image', 'screenshot', 'text']);
const MAX_QUERY = 200;
// Meaning matches below this are dropped. Tuned on real saves: related ones scored 0.36 to 0.62,
// unrelated ones 0.33 and below (text-embedding-3-small, 1024 dimensions).
const MIN_SIMILARITY = 0.34;

type Row = {
  id: string;
  kind: string;
  source: string;
  url: string | null;
  title: string | null;
  snippet: string | null;
  summary: string | null;
  tags: string[];
  note: string | null;
  thumbnail_path: string | null;
  created_at: string;
  processed_at: string | null;
  collection_name: string | null;
  score: number;
};

const json = (body: unknown, status = 200) => Response.json(body, { status });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'Sign in to search.' }, 401);

  let body: { query?: unknown; kind?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Send a JSON body with a query.' }, 400);
  }
  const query = typeof body.query === 'string' ? body.query.slice(0, MAX_QUERY).trim() : '';
  const pickedKind = typeof body.kind === 'string' && KINDS.has(body.kind) ? body.kind : null;
  if (!query) return json({ results: [] });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: user } = await db.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
  if (!user.user) return json({ error: 'Sign in to search.' }, 401);

  const parsed = parseQuery(query);
  const kind = pickedKind ?? parsed.kind; // a pill the person tapped wins over words in the question

  // Embed what's left after filters; a question that was only a filter ("from instagram") has nothing to embed.
  let embedding: string | null = null;
  if (parsed.text) {
    try {
      embedding = toVector((await embed([parsed.text]))[0]);
    } catch (error) {
      console.error('query embedding failed', error); // word matches still work
    }
  }

  const { data, error } = await db.rpc('search_saves', {
    query_text: parsed.terms.join(' '),
    query_embedding: embedding,
    kind_filter: kind,
    source_filter: parsed.source,
    min_similarity: MIN_SIMILARITY,
  });
  if (error) {
    console.error('search_saves failed', error);
    return json({ error: "Search didn't work. Check your connection and try again." }, 500);
  }

  const results = (data as Row[]).map((row) => {
    const label = sourceLabel(row.source);
    const matches: Match[] = findMatches(
      {
        title: row.title,
        snippet: row.snippet,
        summary: row.summary,
        tags: row.tags.join(', '),
        note: row.note,
        collection: row.collection_name,
        source: row.kind === 'link' ? label : null,
      },
      parsed.terms,
    );
    // "from instagram" matched the source even though the word itself was taken out as a filter.
    if (parsed.source && row.kind === 'link' && !matches.some((m) => m.field === 'source')) {
      matches.push({ field: 'source', term: label });
    }
    const { score: _score, ...save } = row;
    return { ...save, matches };
  });

  return json({ results, filters: { kind, source: parsed.source } });
});
