-- Step 10 (owner decision): the admin dashboard. Admins are listed by email; only the service role can read
-- the list (RLS on, no policies). Profiles hold per-person plan settings: plan_override lets an admin give
-- Pro (Part B adds pro_until from RevenueCat). Each person can read their own profile.
set local lock_timeout = '5s';

create table public.admins (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

insert into public.admins (email) values ('oluyomi@urbanbaze.com');

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan_override text check (plan_override in ('pro')),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke insert, update, delete on public.profiles from anon, authenticated;
create policy "Own profile: select" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);

-- The dashboard's numbers. Only the service role may call these (the admin-stats function, after it checks
-- the caller is an admin). They return counts, behaviour and sources, never what anyone saved.
create function public.admin_is_pro(p_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.user_id = p_user and p.plan_override = 'pro');
$$;

create function public.admin_overview(p_days integer default 30)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with days as (
    select generate_series(current_date - (p_days - 1), current_date, interval '1 day')::date as day
  ),
  save_counts as (select user_id, count(*) as n from public.saves group by user_id)
  select jsonb_build_object(
    'users', jsonb_build_object(
      'total', (select count(*) from auth.users),
      'new_today', (select count(*) from auth.users where created_at >= current_date),
      'new_7d', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
      'active_1d', (select count(distinct user_id) from public.events where created_at >= now() - interval '1 day'),
      'active_7d', (select count(distinct user_id) from public.events where created_at >= now() - interval '7 days'),
      'pro', (select count(*) from public.profiles where plan_override = 'pro')
    ),
    'saves', jsonb_build_object(
      'total', (select count(*) from public.saves),
      'today', (select count(*) from public.saves where created_at >= current_date),
      'searches_7d', (select count(*) from public.events where name = 'search_made' and created_at >= now() - interval '7 days'),
      'reminders', (select count(*) from public.saves where reminder_at > now())
    ),
    'daily', (
      select jsonb_agg(jsonb_build_object(
        'day', d.day,
        'saves', (select count(*) from public.saves s where s.created_at::date = d.day),
        'new_users', (select count(*) from auth.users u where u.created_at::date = d.day),
        'active_users', (select count(distinct e.user_id) from public.events e where e.created_at::date = d.day),
        'searches', (select count(*) from public.events e where e.name = 'search_made' and e.created_at::date = d.day)
      ) order by d.day)
      from days d
    ),
    'sources', (
      select coalesce(jsonb_object_agg(source, n), '{}'::jsonb)
      from (select source, count(*) as n from public.saves where kind = 'link' group by source) x
    ),
    'kinds', (
      select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb)
      from (select kind, count(*) as n from public.saves group by kind) x
    ),
    'funnel', jsonb_build_object(
      'intro_finished', (select count(distinct user_id) from public.events where name = 'intro_finished'),
      'signed_in', (select count(*) from auth.users),
      'first_save', (select count(*) from save_counts where n >= 1),
      'ten_saves', (select count(*) from save_counts where n >= 10),
      'fifty_saves', (select count(*) from save_counts where n >= 50),
      'pro', (select count(*) from public.profiles where plan_override = 'pro')
    )
  );
$$;

create function public.admin_users()
returns table (
  id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, last_active timestamptz,
  saves bigint, sources text[], pro boolean
)
language sql stable security definer set search_path = ''
as $$
  select
    u.id, u.email::text, u.created_at, u.last_sign_in_at,
    (select max(e.created_at) from public.events e where e.user_id = u.id),
    (select count(*) from public.saves s where s.user_id = u.id),
    (select coalesce(array_agg(distinct s.source order by s.source), '{}') from public.saves s where s.user_id = u.id),
    public.admin_is_pro(u.id)
  from auth.users u
  order by u.created_at desc;
$$;

-- AI cost per day from the processing log; embeddings cost a small fraction of this and aren't logged.
create function public.admin_costs(p_days integer default 30)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with days as (
    select generate_series(current_date - (p_days - 1), current_date, interval '1 day')::date as day
  )
  select jsonb_build_object(
    'total_usd', (select coalesce(sum(cost_usd), 0) from public.ai_runs where purpose = 'live'),
    'runs', (select count(*) from public.ai_runs where purpose = 'live'),
    'per_save_usd', (select coalesce(avg(cost_usd), 0) from public.ai_runs where purpose = 'live' and error is null),
    'last_30d_usd', (select coalesce(sum(cost_usd), 0) from public.ai_runs where purpose = 'live' and created_at >= now() - interval '30 days'),
    'active_users_30d', (select count(distinct user_id) from public.events where created_at >= now() - interval '30 days'),
    'daily', (
      select jsonb_agg(jsonb_build_object(
        'day', d.day,
        'usd', (select coalesce(sum(r.cost_usd), 0) from public.ai_runs r where r.purpose = 'live' and r.created_at::date = d.day),
        'runs', (select count(*) from public.ai_runs r where r.purpose = 'live' and r.created_at::date = d.day)
      ) order by d.day)
      from days d
    )
  );
$$;

create function public.admin_set_pro(p_user uuid, p_pro boolean)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.profiles (user_id, plan_override, updated_at)
  values (p_user, case when p_pro then 'pro' end, now())
  on conflict (user_id) do update set plan_override = excluded.plan_override, updated_at = now();
$$;

revoke execute on function public.admin_is_pro(uuid), public.admin_overview(integer), public.admin_users(),
  public.admin_costs(integer), public.admin_set_pro(uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_is_pro(uuid), public.admin_overview(integer), public.admin_users(),
  public.admin_costs(integer), public.admin_set_pro(uuid, boolean) to service_role;
