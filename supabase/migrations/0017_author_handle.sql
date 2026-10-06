-- Step 10 (owner request): the poster's public handle for social posts ("@pplreunitedsurprise", "u/name"),
-- shown beside the brand icon instead of the platform name. Written by process-save from public metadata.
set local lock_timeout = '5s';

alter table public.saves
  add column author_handle text check (char_length(author_handle) <= 80);
