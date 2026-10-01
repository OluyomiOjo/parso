-- array_to_string is only STABLE, so generated columns need an immutable wrapper.
create function public.tags_to_text(tags text[])
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$ select coalesce(pg_catalog.array_to_string(tags, ' '), '') $$;

create table public.saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  collection_id uuid references public.collections (id) on delete set null,
  kind text not null check (kind in ('link', 'image', 'screenshot', 'text')),
  source text not null default 'other'
    check (source in ('instagram', 'tiktok', 'x', 'youtube', 'facebook', 'safari', 'whatsapp', 'other')),
  url text,
  title text,
  snippet text,
  summary text,
  tags text[] not null default '{}',
  note text,
  thumbnail_path text,
  raw_text text,
  reminder_at timestamptz,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  -- 1024 dimensions matches Voyage's default embedding model.
  embedding extensions.vector(1024),
  fts tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', public.tags_to_text(tags)), 'A') ||
    setweight(to_tsvector('english', coalesce(snippet, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(note, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(raw_text, '')), 'C')
  ) stored
);

create index saves_user_created_idx on public.saves (user_id, created_at desc);
create index saves_collection_idx on public.saves (collection_id);
create index saves_fts_idx on public.saves using gin (fts);
