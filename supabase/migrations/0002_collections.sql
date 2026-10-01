create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  description text,
  is_smart boolean not null default true,
  created_at timestamptz not null default now()
);

-- One collection per name per user, ignoring case.
create unique index collections_user_name_key on public.collections (user_id, lower(name));
