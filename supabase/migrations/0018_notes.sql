-- Notes that work like Apple Notes (owner-approved, step 10 follow-up): pinning, an edited time, and the AI
-- filing a note once the person stops typing instead of on the first character.

alter table public.saves
  add column pinned boolean not null default false,
  add column edited_at timestamptz;

-- Notes are plain text (src/lib/noteFormat.ts); 20,000 characters is plenty and keeps rows small.
alter table public.saves
  add constraint saves_raw_text_length check (raw_text is null or char_length(raw_text) <= 20000);

-- Existing notes sort by when they were saved until they're edited.
update public.saves set edited_at = created_at where kind = 'text' and edited_at is null;

create index saves_notes_idx on public.saves (user_id, pinned desc, edited_at desc) where kind = 'text';

-- The edited time comes from the database clock, not the phone's, so the server can tell when typing stopped.
create function private.stamp_edited_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.edited_at is not null and (tg_op = 'INSERT' or new.edited_at is distinct from old.edited_at) then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

create trigger saves_stamp_edited_at
  before insert or update of edited_at on public.saves
  for each row execute function private.stamp_edited_at();

-- Notes written in the editor arrive with edited_at set. They skip the immediate processing every other save
-- gets, and are filed by note_save instead: it waits a few seconds and runs only once typing has stopped.
-- After the first filing, the same call refreshes the note's search data as it is edited (the AI does not
-- run again).
create or replace trigger saves_process_after_insert
  after insert on public.saves
  for each row
  when (new.edited_at is null)
  execute function private.queue_process_save();

create function private.queue_note_save()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.call_edge_function('process-save', jsonb_build_object('note_save', new.id));
  return new;
end;
$$;

create trigger saves_note_after_insert
  after insert on public.saves
  for each row
  when (new.kind = 'text' and new.edited_at is not null)
  execute function private.queue_note_save();

create trigger saves_note_after_edit
  after update of edited_at on public.saves
  for each row
  when (new.kind = 'text' and new.edited_at is distinct from old.edited_at)
  execute function private.queue_note_save();
