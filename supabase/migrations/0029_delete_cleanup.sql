-- Clean-up after saves go (owner reports after build 18):
-- 1. A deleted save's picture and photo are removed from storage by the server, however the save was deleted
--    (process-save's delete_files). The app's own clean-up stays; removing a file twice is harmless, as it is when
--    delete-account has already removed the person's folders.
-- 2. A collection left empty, because its last save was deleted or moved out, is deleted. A collection created from
--    the Move to sheet is unaffected: it gets its save straight away.
-- Statement-level triggers with transition tables, so a bulk delete makes one call, not one per save.
set local lock_timeout = '5s';

create function private.after_saves_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  files jsonb;
begin
  select jsonb_build_object(
    'thumbnails', coalesce(jsonb_agg(g.thumbnail_path) filter (where g.thumbnail_path is not null), '[]'::jsonb),
    'uploads', coalesce(jsonb_agg(format('%s/%s.jpg', g.user_id, g.id)) filter (where g.kind in ('image', 'screenshot')), '[]'::jsonb)
  ) into files
  from gone g;
  if jsonb_array_length(files -> 'thumbnails') > 0 or jsonb_array_length(files -> 'uploads') > 0 then
    perform private.call_edge_function('process-save', jsonb_build_object('delete_files', files));
  end if;
  return null;
end;
$$;

create function private.after_saves_deleted_collections()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.collections c
  where c.id in (select g.collection_id from gone g where g.collection_id is not null)
    and not exists (select 1 from public.saves s where s.collection_id = c.id);
  return null;
end;
$$;

create function private.after_saves_moved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.collections c
  where c.id in (
      select b.collection_id from before_rows b join after_rows a on a.id = b.id
      where b.collection_id is not null and a.collection_id is distinct from b.collection_id
    )
    and not exists (select 1 from public.saves s where s.collection_id = c.id);
  return null;
end;
$$;

create trigger saves_files_after_delete
  after delete on public.saves
  referencing old table as gone
  for each statement execute function private.after_saves_deleted();

create trigger saves_collections_after_delete
  after delete on public.saves
  referencing old table as gone
  for each statement execute function private.after_saves_deleted_collections();

create trigger saves_collections_after_move
  after update on public.saves
  referencing old table as before_rows new table as after_rows
  for each statement execute function private.after_saves_moved();

revoke execute on function private.after_saves_deleted(), private.after_saves_deleted_collections(),
  private.after_saves_moved() from public, anon, authenticated;

-- One-off helper for process-save's orphan_files: stored files whose save no longer exists. Service role only.
create function public.orphan_files()
returns table (bucket text, name text)
language sql stable security definer set search_path = ''
as $$
  select o.bucket_id, o.name
  from storage.objects o
  where o.bucket_id in ('thumbnails', 'uploads')
    and not exists (select 1 from public.saves s where s.id::text = split_part(split_part(o.name, '/', 2), '.', 1));
$$;
revoke execute on function public.orphan_files() from public, anon, authenticated;
grant execute on function public.orphan_files() to service_role;
