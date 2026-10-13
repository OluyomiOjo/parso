-- The 14-day free trial on Yearly (owner decision after build 22): the dashboard's Revenue page gains the three
-- launch numbers. Counts only, service role only, as before (migration 0028).
set local lock_timeout = '5s';

create or replace function public.admin_revenue(p_days integer default 30)
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
  ),
  trial_starts as (
    select user_id from paid where type = 'INITIAL_PURCHASE' and period_type = 'TRIAL' and user_id is not null
  ),
  -- People who joined in the chosen period, moved back two weeks so their second week is already over.
  week_two_people as (
    select id, created_at from auth.users
    where created_at >= current_date - (p_days - 1) - 14 and created_at < now() - interval '14 days'
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
    -- The three launch numbers (owner decision after build 22): new accounts to trial starts, trial starts to
    -- paid (a trial that renewed), and how many people searched their saves in their second week.
    'trials', jsonb_build_object(
      'new_accounts', (select count(*) from auth.users where created_at >= current_date - (p_days - 1)),
      'started', (select count(distinct user_id) from trial_starts),
      'converted', (
        select count(distinct r.user_id) from public.revenue_events r
        where r.environment = 'PRODUCTION' and r.type = 'RENEWAL' and r.user_id in (select user_id from trial_starts)
      )
    ),
    'week_two', jsonb_build_object(
      'eligible', (select count(*) from week_two_people),
      'searched', (
        select count(*) from week_two_people w
        where exists (
          select 1 from public.events e
          where e.user_id = w.id and e.name = 'search_made'
            and e.created_at >= w.created_at + interval '7 days' and e.created_at < w.created_at + interval '14 days'
        )
      )
    ),
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
