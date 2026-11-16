create table if not exists public.hyperpop_proxy_usage (
  user_id uuid primary key references public.hyperpop_accounts(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  minute_requests integer not null default 0 check (minute_requests >= 0),
  day_started_at date not null default current_date,
  day_requests integer not null default 0 check (day_requests >= 0),
  updated_at timestamptz not null default now()
);

alter table public.hyperpop_proxy_usage enable row level security;
revoke all on table public.hyperpop_proxy_usage from public, anon, authenticated;
grant all on table public.hyperpop_proxy_usage to service_role;

create or replace function public.hyperpop_proxy_consume_quota(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_minute integer;
  v_day integer;
begin
  if p_user_id is null then
    return jsonb_build_object('allowed', false, 'error', 'Invalid account.');
  end if;

  insert into public.hyperpop_proxy_usage
    (user_id, window_started_at, minute_requests, day_started_at, day_requests, updated_at)
  values
    (p_user_id, now(), 1, current_date, 1, now())
  on conflict (user_id) do update set
    minute_requests = case
      when public.hyperpop_proxy_usage.window_started_at <= now() - interval '1 minute' then 1
      else public.hyperpop_proxy_usage.minute_requests + 1
    end,
    window_started_at = case
      when public.hyperpop_proxy_usage.window_started_at <= now() - interval '1 minute' then now()
      else public.hyperpop_proxy_usage.window_started_at
    end,
    day_requests = case
      when public.hyperpop_proxy_usage.day_started_at < current_date then 1
      else public.hyperpop_proxy_usage.day_requests + 1
    end,
    day_started_at = case
      when public.hyperpop_proxy_usage.day_started_at < current_date then current_date
      else public.hyperpop_proxy_usage.day_started_at
    end,
    updated_at = now()
  returning minute_requests, day_requests into v_minute, v_day;

  return jsonb_build_object(
    'allowed', v_minute <= 30 and v_day <= 500,
    'minute_requests', v_minute,
    'daily_requests', v_day,
    'minute_limit', 30,
    'daily_limit', 500
  );
end;
$function$;

revoke all on function public.hyperpop_proxy_consume_quota(uuid) from public, anon, authenticated;
grant execute on function public.hyperpop_proxy_consume_quota(uuid) to service_role;
