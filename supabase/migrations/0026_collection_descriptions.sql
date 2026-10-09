-- Collection descriptions written from what's inside (owner request after build 16), refreshed as a collection
-- grows: described_count is how many saves it held when its description was last written.
alter table public.collections add column described_count integer;
