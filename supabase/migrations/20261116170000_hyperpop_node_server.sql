create table if not exists public.hyperpop_node_owner (
  singleton boolean primary key default true check (singleton = true),
  owner_user_id uuid not null references public.hyperpop_accounts(id) on delete cascade,
  claimed_at timestamptz not null default now()
);
alter table public.hyperpop_node_owner enable row level security;
revoke all on table public.hyperpop_node_owner from public, anon, authenticated;
grant all on table public.hyperpop_node_owner to service_role;

create table if not exists public.hyperpop_node_projects (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.hyperpop_accounts(id) on delete cascade,
  slug text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id, slug),
  check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$')
);
create index if not exists hyperpop_node_projects_owner_idx on public.hyperpop_node_projects(owner_user_id, created_at);
alter table public.hyperpop_node_projects enable row level security;
revoke all on table public.hyperpop_node_projects from public, anon, authenticated;
grant all on table public.hyperpop_node_projects to service_role;

create table if not exists public.hyperpop_node_files (
  project_id uuid not null references public.hyperpop_node_projects(id) on delete cascade,
  owner_user_id uuid not null references public.hyperpop_accounts(id) on delete cascade,
  path text not null,
  content text not null,
  updated_at timestamptz not null default now(),
  primary key(project_id, path),
  check (length(path) between 1 and 512),
  check (left(path,1) <> '/' and path !~ '(^|/)\.\.?(/|$)' and position('\\' in path) = 0),
  check (octet_length(content) <= 262144)
);
create index if not exists hyperpop_node_files_owner_idx on public.hyperpop_node_files(owner_user_id, project_id);
alter table public.hyperpop_node_files enable row level security;
revoke all on table public.hyperpop_node_files from public, anon, authenticated;
grant all on table public.hyperpop_node_files to service_role;