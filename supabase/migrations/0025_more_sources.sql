-- More platforms recognised by name (owner request after build 16): Vimeo, Bluesky, Tumblr, SoundCloud, Twitch and
-- Snapchat, for saves and the usage numbers. Links from them were saved as 'other' until now.
set local lock_timeout = '5s';

alter table public.saves drop constraint saves_source_check;
alter table public.saves add constraint saves_source_check check (source in (
  'instagram', 'tiktok', 'x', 'threads', 'youtube', 'facebook', 'pinterest', 'linkedin', 'reddit', 'spotify',
  'safari', 'whatsapp', 'vimeo', 'bluesky', 'tumblr', 'soundcloud', 'twitch', 'snapchat', 'other'
));

alter table public.events drop constraint events_source_check;
alter table public.events add constraint events_source_check check (source in (
  'instagram', 'tiktok', 'x', 'threads', 'youtube', 'facebook', 'pinterest', 'linkedin', 'reddit', 'spotify',
  'safari', 'whatsapp', 'vimeo', 'bluesky', 'tumblr', 'soundcloud', 'twitch', 'snapchat', 'other'
));
