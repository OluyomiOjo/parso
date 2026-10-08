-- Parso Pro (step 11, owner decisions in step 10): free for the first 50 saves in total; Pro through RevenueCat
-- ($4.99 a month or $39.99 a year). The database is the record of who is Pro, so every phone agrees.

-- 1. Pro from a subscription: RevenueCat keeps these current (revenuecat-webhook and sync-pro). plan_override
-- ('pro' when an admin gives Pro, migration 0016) still counts too.
alter table public.profiles
  add column pro_until timestamptz,
  add column pro_product text,
  add column pro_store text;

create function private.is_pro(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = p_user and (p.plan_override = 'pro' or p.pro_until > now())
  );
$$;

-- The dashboard's Pro flag now includes subscribers.
create or replace function public.admin_is_pro(p_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_pro(p_user);
$$;

-- 2. The free limit, enforced here so no app version can get around it. Editing existing saves is never limited.
create function private.enforce_save_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_pro(new.user_id) then
    return new;
  end if;
  if (select count(*) from public.saves s where s.user_id = new.user_id) >= 50 then
    raise exception 'save_limit_reached' using errcode = 'P0001', hint = 'Parso Pro saves without a limit.';
  end if;
  return new;
end;
$$;

create trigger saves_limit_before_insert
  before insert on public.saves
  for each row execute function private.enforce_save_limit();

-- What the app shows: Pro or not, until when, and how many saves are used. Only ever about the caller.
create function public.my_plan()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'pro', private.is_pro((select auth.uid())),
    'pro_until', (select p.pro_until from public.profiles p where p.user_id = (select auth.uid())),
    'admin_pro', exists (
      select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.plan_override = 'pro'
    ),
    'used', (select count(*) from public.saves s where s.user_id = (select auth.uid())),
    'limit', 50
  );
$$;
revoke execute on function public.my_plan() from public, anon;
grant execute on function public.my_plan() to authenticated;

-- 3. Subscription events from RevenueCat, for the dashboard's Revenue page. Server only. The event id makes a
-- repeated delivery harmless. Deleting an account keeps the money history without the person.
create table public.revenue_events (
  id text primary key,
  user_id uuid references auth.users (id) on delete set null,
  type text not null,
  product_id text,
  store text,
  environment text,
  price_usd numeric(10, 2),
  currency text,
  period_type text,
  purchased_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.revenue_events enable row level security;
revoke all on public.revenue_events from anon, authenticated;
create index revenue_events_created_idx on public.revenue_events (created_at);
