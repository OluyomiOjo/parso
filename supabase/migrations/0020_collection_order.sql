-- Collections in an order the person chooses (owner request, step 10 follow-up). position stays empty until
-- they rearrange; empty ones sort after the placed ones, most recently used first, so a collection the AI
-- creates later goes at the end.

alter table public.collections add column position integer;

-- Same view as 0009, plus position and one cover picture: the newest save in the collection that has one,
-- for the circles on My Parsos.
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
        where s2.collection_id = c.id
        order by s2.created_at desc
        limit 2
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

-- Saves a whole new order in one step. Runs with the caller's rights, so row security limits it to their own
-- collections; ids that aren't theirs are simply not updated.
create function public.reorder_collections(ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.collections c
  set position = o.ord
  from unnest(ids) with ordinality as o(id, ord)
  where c.id = o.id;
$$;

revoke execute on function public.reorder_collections(uuid[]) from public, anon;
grant execute on function public.reorder_collections(uuid[]) to authenticated;
