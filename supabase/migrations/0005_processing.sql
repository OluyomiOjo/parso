-- Step 4: AI processing of saves.

-- 1. More sources (owner asked for Pinterest, Threads, LinkedIn, Reddit and Spotify alongside the originals).
alter table public.saves drop constraint saves_source_check;
alter table public.saves add constraint saves_source_check check (source in (
  'instagram', 'tiktok', 'x', 'threads', 'youtube', 'facebook', 'pinterest', 'linkedin',
  'reddit', 'spotify', 'safari', 'whatsapp', 'other'
));

-- 2. The app hears about processed saves live. RLS still applies to Realtime.
alter publication supabase_realtime add table public.saves;

-- 3. Private thumbnails: <user_id>/<save_id>.<ext>. Only the server writes; each user reads their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('thumbnails', 'thumbnails', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

create policy "Own thumbnails: select" on storage.objects
  for select to authenticated
  using (bucket_id = 'thumbnails' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 4. Server-only settings and AI call log. RLS on with no policies: only the service role can touch them.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.settings (
  key text primary key,
  value text not null
);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  save_id uuid references public.saves (id) on delete set null,
  user_id uuid references auth.users (id) on delete cascade,
  purpose text not null check (purpose in ('live', 'compare')),
  provider text not null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric(10, 6),
  duration_ms integer,
  output jsonb,
  error text,
  created_at timestamptz not null default now()
);
alter table public.ai_runs enable row level security;
revoke all on public.ai_runs from anon, authenticated;
create index ai_runs_save_idx on public.ai_runs (save_id);

-- 5. Shared secret between the trigger and the Edge Functions, generated here so nobody handles it.
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'process_save_secret');

insert into private.settings (key, value) values
  ('functions_url', 'https://pkmyxgykkpjpjsvlgnms.supabase.co/functions/v1'),
  ('ai_provider', 'anthropic');

-- Edge Functions (service role only) read the secret and the live provider through this.
create function public.get_processing_config()
returns table (secret text, ai_provider text)
language sql
security definer
set search_path = ''
as $$
  select
    (select decrypted_secret from vault.decrypted_secrets where name = 'process_save_secret'),
    (select value from private.settings where key = 'ai_provider');
$$;
revoke execute on function public.get_processing_config() from public, anon, authenticated;
grant execute on function public.get_processing_config() to service_role;

-- 6. Every new save is sent to process-save. pg_net is asynchronous, so the insert never waits.
create extension if not exists pg_net with schema extensions;

create function private.call_edge_function(fn text, payload jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  return net.http_post(
    url := (select value from private.settings where key = 'functions_url') || '/' || fn,
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-parso-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'process_save_secret')
    ),
    timeout_milliseconds := 10000
  );
end;
$$;
revoke execute on function private.call_edge_function(text, jsonb) from public, anon, authenticated;

create function private.queue_process_save()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.call_edge_function('process-save', jsonb_build_object('save_id', new.id));
  return new;
end;
$$;

create trigger saves_process_after_insert
  after insert on public.saves
  for each row execute function private.queue_process_save();
