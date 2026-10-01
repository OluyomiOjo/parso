-- Hybrid search for the `search` Edge Function: word matches (full-text on `fts`) and meaning matches
-- (embeddings), merged by Reciprocal Rank Fusion. security invoker: row security limits it to the
-- caller's own saves.
create function public.search_saves(
  query_text text,
  query_embedding extensions.vector(1024),
  kind_filter text default null,
  source_filter text default null,
  match_count int default 30,
  min_similarity float default 0.3
)
returns table (
  id uuid,
  kind text,
  source text,
  url text,
  title text,
  snippet text,
  summary text,
  tags text[],
  note text,
  thumbnail_path text,
  created_at timestamptz,
  processed_at timestamptz,
  collection_name text,
  score float
)
language sql
stable
security invoker
set search_path = ''
as $$
  with
  -- Any one word is enough ("visa bulletin" finds saves with either), ranked so more and better
  -- placed words come first. Stop words disappear in the english config.
  q as (
    select nullif(replace(pg_catalog.plainto_tsquery('english', coalesce(query_text, ''))::text, '&', '|'), '')
      as tsq
  ),
  candidates as (
    select s.*
    from public.saves s
    where (kind_filter is null or s.kind = kind_filter)
      and (source_filter is null or s.source = source_filter)
  ),
  by_words as (
    select c.id, row_number() over (order by pg_catalog.ts_rank_cd(c.fts, q.tsq::tsquery) desc) as rank
    from candidates c, q
    where q.tsq is not null and c.fts @@ q.tsq::tsquery
    order by rank
    limit 50
  ),
  by_meaning as (
    select c.id, row_number() over (order by c.embedding operator(extensions.<=>) query_embedding) as rank
    from candidates c
    where query_embedding is not null
      and c.embedding is not null
      and 1 - (c.embedding operator(extensions.<=>) query_embedding) >= min_similarity
    order by rank
    limit 50
  ),
  fused as (
    select coalesce(w.id, m.id) as id,
      coalesce(1.0 / (60 + w.rank), 0) + coalesce(1.0 / (60 + m.rank), 0) as score
    from by_words w
    full join by_meaning m on m.id = w.id
  ),
  -- With no words to search (only a filter, like "from instagram"), list the newest matching saves.
  filter_only as (
    select c.id, 1.0 / (60 + row_number() over (order by c.created_at desc)) as score
    from candidates c, q
    where q.tsq is null and query_embedding is null
      and (kind_filter is not null or source_filter is not null)
  ),
  ranked as (
    select * from fused
    union all
    select * from filter_only
  )
  select s.id, s.kind, s.source, s.url, s.title, s.snippet, s.summary, s.tags, s.note, s.thumbnail_path,
    s.created_at, s.processed_at, col.name, r.score
  from ranked r
  join public.saves s on s.id = r.id
  left join public.collections col on col.id = s.collection_id
  order by r.score desc, s.created_at desc
  limit match_count;
$$;

revoke all on function public.search_saves from public, anon;
grant execute on function public.search_saves to authenticated;
