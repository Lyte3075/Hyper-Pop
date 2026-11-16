create table if not exists public.hyperpop_proxy_routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.hyperpop_accounts(id) on delete cascade,
  slug text not null,
  origin text not null,
  path_prefix text not null default '',
  allowed_methods text[] not null default array['GET','HEAD']::text[],
  secret_id uuid,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug),
  check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$'),
  check (origin ~ '^https://[a-z0-9.-]+$'),
  check (path_prefix = '' or (left(path_prefix,1) = '/' and path_prefix !~ '(^|/)\.\.?(/|$)' and position('\\' in path_prefix) = 0 and position('//' in path_prefix) = 0)),
  check (cardinality(allowed_methods) between 1 and 7),
  check (allowed_methods <@ array['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS']::text[])
);

create index if not exists hyperpop_proxy_routes_user_enabled_idx
  on public.hyperpop_proxy_routes (user_id, enabled);

alter table public.hyperpop_proxy_routes enable row level security;
revoke all on table public.hyperpop_proxy_routes from public, anon, authenticated;
grant all on table public.hyperpop_proxy_routes to service_role;

create or replace function public.hyperpop_proxy_route_action(
  p_user_id uuid,
  p_action text,
  p_slug text default null,
  p_origin text default null,
  p_path_prefix text default '',
  p_methods text[] default array['GET','HEAD']::text[],
  p_secret_headers jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_route public.hyperpop_proxy_routes%rowtype;
  v_secret_id uuid;
  v_result jsonb;
  v_count integer;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'Invalid account.');
  end if;

  if p_action = 'list' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'slug', r.slug,
      'origin', r.origin,
      'path_prefix', r.path_prefix,
      'allowed_methods', r.allowed_methods,
      'enabled', r.enabled,
      'has_secret', r.secret_id is not null,
      'created_at', r.created_at,
      'updated_at', r.updated_at
    ) order by r.created_at desc), '[]'::jsonb)
    into v_result
    from public.hyperpop_proxy_routes r
    where r.user_id = p_user_id;
    return jsonb_build_object('ok', true, 'routes', v_result);
  end if;

  if p_action = 'get' then
    select * into v_route
    from public.hyperpop_proxy_routes
    where user_id = p_user_id and slug = p_slug and enabled = true;
    if not found then return jsonb_build_object('ok', false, 'error', 'Route not found.'); end if;

    v_result := jsonb_build_object(
      'ok', true,
      'slug', v_route.slug,
      'origin', v_route.origin,
      'path_prefix', v_route.path_prefix,
      'allowed_methods', v_route.allowed_methods,
      'secret_headers', case
        when v_route.secret_id is null then '{}'::jsonb
        else coalesce((
          select s.decrypted_secret::jsonb
          from vault.decrypted_secrets s
          where s.id = v_route.secret_id
        ), '{}'::jsonb)
      end
    );
    return v_result;
  end if;

  if p_action = 'save' then
    if p_slug is null or p_origin is null then
      return jsonb_build_object('ok', false, 'error', 'A route name and origin are required.');
    end if;

    select count(*) into v_count
    from public.hyperpop_proxy_routes
    where user_id = p_user_id and slug <> p_slug;
    if v_count >= 20 and not exists (
      select 1 from public.hyperpop_proxy_routes where user_id = p_user_id and slug = p_slug
    ) then
      return jsonb_build_object('ok', false, 'error', 'Each account can create up to 20 routes.');
    end if;

    select * into v_route
    from public.hyperpop_proxy_routes
    where user_id = p_user_id and slug = p_slug
    for update;

    v_secret_id := v_route.secret_id;
    if p_secret_headers is not null then
      if jsonb_typeof(p_secret_headers) <> 'object' then
        return jsonb_build_object('ok', false, 'error', 'Secret headers must be a JSON object.');
      end if;
      if v_secret_id is null then
        v_secret_id := vault.create_secret(
          p_secret_headers::text,
          'hyperpop-route-' || p_user_id::text || '-' || p_slug,
          'Encrypted upstream headers for a Hyper-Pop reverse proxy route',
          null
        );
      else
        perform vault.update_secret(v_secret_id, p_secret_headers::text, null, null, null);
      end if;
    end if;

    insert into public.hyperpop_proxy_routes
      (user_id, slug, origin, path_prefix, allowed_methods, secret_id, enabled, updated_at)
    values
      (p_user_id, p_slug, p_origin, coalesce(p_path_prefix, ''),
       coalesce(p_methods, array['GET','HEAD']::text[]), v_secret_id, true, now())
    on conflict (user_id, slug) do update set
      origin = excluded.origin,
      path_prefix = excluded.path_prefix,
      allowed_methods = excluded.allowed_methods,
      secret_id = excluded.secret_id,
      enabled = true,
      updated_at = now();

    return jsonb_build_object('ok', true, 'slug', p_slug, 'has_secret', v_secret_id is not null);
  end if;

  if p_action = 'delete' then
    select * into v_route
    from public.hyperpop_proxy_routes
    where user_id = p_user_id and slug = p_slug
    for update;
    if not found then return jsonb_build_object('ok', false, 'error', 'Route not found.'); end if;

    if v_route.secret_id is not null then
      perform vault.update_secret(v_route.secret_id, '{}', null, null, null);
    end if;
    delete from public.hyperpop_proxy_routes
    where user_id = p_user_id and slug = p_slug;
    return jsonb_build_object('ok', true, 'deleted', p_slug);
  end if;

  return jsonb_build_object('ok', false, 'error', 'Unknown route action.');
end;
$function$;

revoke all on function public.hyperpop_proxy_route_action(uuid,text,text,text,text,text[],jsonb) from public, anon, authenticated;
grant execute on function public.hyperpop_proxy_route_action(uuid,text,text,text,text,text[],jsonb) to service_role;
