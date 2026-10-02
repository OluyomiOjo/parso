-- Step 10: the grid view on My Parsos and Collections lays each picture out at its real shape before it
-- loads. process-save records the stored thumbnail's size; older thumbnails are filled in by the
-- thumbnail_sizes backfill.
set local lock_timeout = '5s';

alter table public.saves
  add column thumbnail_width integer check (thumbnail_width > 0),
  add column thumbnail_height integer check (thumbnail_height > 0);
