-- Board-style cards on the Collections tab (owner decision, step 11): one large picture and two small ones. recent
-- now holds the three newest saves that have a picture (it was the two newest saves, pictures or not). Same
-- columns as 0020, so nothing else changes.
create or replace view public.collection_overview
with (security_invoker = true) as
select
  c.id,
  c.name,
  c.description,
  c.created_at,
  count(s.id)::int as save_count,
  max(s.created_at) as last_saved_at,
  coalesce(
    (
      select jsonb_agg(jsonb_build_object('thumbnail_path', r.thumbnail_path, 'kind', r.kind, 'source', r.source)
        order by r.created_at desc)
      from (
        select s2.thumbnail_path, s2.kind, s2.source, s2.created_at
        from public.saves s2
        where s2.collection_id = c.id and s2.thumbnail_path is not null
        order by s2.created_at desc
        limit 3
      ) r
    ),
    '[]'::jsonb
  ) as recent,
  c.position,
  (
    select s3.thumbnail_path
    from public.saves s3
    where s3.collection_id = c.id and s3.thumbnail_path is not null
    order by s3.created_at desc
    limit 1
  ) as cover_path
from public.collections c
left join public.saves s on s.collection_id = c.id
group by c.id;
