-- "Your week in Parso" and Done (owner decisions in step 11): every save gets one short question about what the
-- person meant to do with it, written by the AI with the rest of its description, and can be marked done.
set local lock_timeout = '5s';

alter table public.saves
  add column next_step text check (next_step is null or char_length(next_step) <= 70),
  add column done_at timestamptz;

-- The weekly screen asks about recent saves that aren't done.
create index saves_open_recent_idx on public.saves (user_id, created_at desc) where done_at is null;

-- Usage numbers gain marking a save done and opening the weekly screen (still no content, migration 0015).
alter table public.events drop constraint events_name_check;
alter table public.events add constraint events_name_check check (name in (
  'app_opened', 'intro_finished', 'signed_in', 'save_created', 'save_opened', 'search_made',
  'reminder_set', 'shared_out', 'downloaded', 'view_switched', 'upgrade_shown', 'purchase_made',
  'restore_tapped', 'save_done', 'week_opened'
));
