-- Step 10 (owner decision): how Parso is used, for the admin dashboard at dash.parso.ai. Never what people
-- save: no titles, links, notes, text or search words, only these fixed fields. Each person can add their
-- own events and nobody can read them from the app; only the admin-stats function (service role) reads them.
set local lock_timeout = '5s';

create table public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (name in (
    'app_opened', 'intro_finished', 'signed_in', 'save_created', 'save_opened', 'search_made',
    'reminder_set', 'shared_out', 'downloaded', 'view_switched', 'upgrade_shown', 'purchase_made',
    'restore_tapped'
  )),
  source text check (source in (
    'instagram', 'tiktok', 'x', 'threads', 'youtube', 'facebook', 'pinterest', 'linkedin',
    'reddit', 'spotify', 'safari', 'whatsapp', 'other'
  )),
  kind text check (kind in ('link', 'image', 'screenshot', 'text')),
  via text check (via in ('share', 'paste', 'clipboard', 'screenshots', 'add', 'grid', 'list')),
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;
revoke all on public.events from anon;
create policy "Own events: insert" on public.events
  for insert to authenticated with check ((select auth.uid()) = user_id);

create index events_created_idx on public.events (created_at);
create index events_user_idx on public.events (user_id, created_at);
