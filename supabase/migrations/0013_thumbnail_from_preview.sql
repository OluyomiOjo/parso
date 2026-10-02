-- Step 10: some sites refuse our server (Medium), so the phone reads the page's preview picture and writes
-- preview_image_url. Once the save is filed and still has no thumbnail, the server stores that picture.
-- Fires on either column so it works whether the phone's write lands before or after processing ends.
set local lock_timeout = '5s';

create function private.queue_thumbnail()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.call_edge_function('process-save', jsonb_build_object('thumbnail_save', new.id));
  return new;
end;
$$;

create trigger saves_thumbnail_from_preview
  after update of preview_image_url, processed_at on public.saves
  for each row
  when (
    new.kind = 'link'
    and new.thumbnail_path is null
    and new.preview_image_url is not null
    and new.processed_at is not null
    and (old.preview_image_url is distinct from new.preview_image_url or old.processed_at is null)
  )
  execute function private.queue_thumbnail();
