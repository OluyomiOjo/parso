-- Step 8: deleting a save removes its pictures, and edits keep search data current.

-- A person may delete files in their own folder only (Delete on the save detail screen).
create policy "Own thumbnails: delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'thumbnails' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Own uploads: delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- After a person changes tags, note or collection on a filed save, refresh its embedding (no AI re-run).
-- old.processed_at is null during the pipeline's own first write, so that write never fires this.
create function private.queue_reembed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.call_edge_function('process-save', jsonb_build_object('embed_save', new.id));
  return new;
end;
$$;

create trigger saves_reembed_after_edit
  after update of tags, note, collection_id on public.saves
  for each row
  when (
    old.processed_at is not null
    and (old.tags, old.note, old.collection_id) is distinct from (new.tags, new.note, new.collection_id)
  )
  execute function private.queue_reembed();
