-- One row per collection for the Collections row, the Collections tab and the collection header:
-- its save count, when it was last used, and the two newest saves for the card's picture tiles.
-- security_invoker makes the view run with the caller's rights, so the row security on collections
-- and saves still decides what each person sees.
create view public.collection_overview
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
  ) as recent
from public.collections c
left join public.saves s on s.collection_id = c.id
group by c.id;

revoke all on public.collection_overview from anon;
grant select on public.collection_overview to authenticated;

