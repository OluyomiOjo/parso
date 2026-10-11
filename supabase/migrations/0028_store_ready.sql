-- Ready for the stores (owner request after build 18): the Pro page shows the person's own numbers, the sign-up
-- funnel gains "Subscribe tapped", the dashboard gets a real Revenue page, and its Pro count includes subscribers.
set local lock_timeout = '5s';

-- 1. Usage numbers gain tapping Subscribe (still no content, migration 0015).
alter table public.events drop constraint events_name_check;
alter table public.events add constraint events_name_check check (name in (
  'app_opened', 'intro_finished', 'signed_in', 'save_created', 'save_opened', 'search_made',
  'reminder_set', 'shared_out', 'downloaded', 'view_switched', 'upgrade_shown', 'purchase_made',
  'restore_tapped', 'save_done', 'week_opened', 'subscribe_tapped'
));

-- 2. The caller's own counts for the Pro page: saves, collections, and how often they opened a save. Events stay
-- unreadable from the app; this returns only the caller's own totals.
create function public.my_numbers()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'saves', (select count(*) from public.saves s where s.user_id = (select auth.uid())),
    'collections', (select count(*) from public.collections c where c.user_id = (select auth.uid())),
    'opened', (
      select count(*) from public.events e where e.user_id = (select auth.uid()) and e.name = 'save_opened'
    )
  );
$$;
revoke execute on function public.my_numbers() from public, anon;
grant execute on function public.my_numbers() to authenticated;

-- 3. The dashboard's Pro numbers count paying subscribers as well as Pro given by an admin.
create or replace function public.admin_overview(p_days integer default 30)
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
      'pro', (select count(*) from auth.users u where private.is_pro(u.id))
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
      'pro', (select count(*) from auth.users u where private.is_pro(u.id))
    )
  );
$$;

-- 4. The Revenue page: the sign-up funnel, subscribers and money. Counts only; service role only.
create function public.admin_revenue(p_days integer default 30)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with days as (
    select generate_series(current_date - (p_days - 1), current_date, interval '1 day')::date as day
  ),
  period_events as (
    select user_id, name from public.events where created_at >= current_date - (p_days - 1)
  ),
  paid as (
    select * from public.revenue_events
    where environment = 'PRODUCTION' and created_at >= current_date - (p_days - 1)
  )
  select jsonb_build_object(
    'funnel', jsonb_build_object(
      'shown', (select count(distinct user_id) from period_events where name = 'upgrade_shown'),
      'tapped', (select count(distinct user_id) from period_events where name = 'subscribe_tapped'),
      'subscribed', (select count(distinct user_id) from period_events where name = 'purchase_made')
    ),
    'subscribers', jsonb_build_object(
      'paying', (select count(*) from public.profiles where pro_until > now()),
      'monthly', (select count(*) from public.profiles where pro_until > now() and pro_product ilike '%monthly%'),
      'yearly', (select count(*) from public.profiles where pro_until > now() and pro_product ilike '%yearly%'),
      'given', (select count(*) from public.profiles where plan_override = 'pro')
    ),
    'revenue_usd', (select coalesce(sum(price_usd), 0) from paid),
    'daily', (
      select jsonb_agg(jsonb_build_object(
        'day', d.day,
        'new_subscribers', (
          select count(*) from public.revenue_events r
          where r.environment = 'PRODUCTION' and r.type = 'INITIAL_PURCHASE' and r.created_at::date = d.day
        ),
        'usd', (select coalesce(sum(p.price_usd), 0) from paid p where p.created_at::date = d.day)
      ) order by d.day)
      from days d
    )
  );
$$;
revoke execute on function public.admin_revenue(integer) from public, anon, authenticated;
grant execute on function public.admin_revenue(integer) to service_role;
