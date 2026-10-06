-- Each note_save call carries the edit's own time. pg_net sends calls in batches, so a call can arrive late;
-- process-save acts only when the time still matches the note's latest edit, so a burst of typing ends in
-- exactly one AI run or search refresh.
create or replace function private.queue_note_save()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.call_edge_function('process-save', jsonb_build_object('note_save', new.id, 'edited_at', new.edited_at));
  return new;
end;
$$;
