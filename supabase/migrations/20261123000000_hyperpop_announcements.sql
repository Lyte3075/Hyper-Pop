create table if not exists public.hyperpop_announcements (
 id uuid primary key default gen_random_uuid(),
 author_account_id uuid not null references public.hyperpop_accounts(id) on delete restrict,
 title text not null check (char_length(title) between 1 and 120),
 body text not null check (char_length(body) between 1 and 5000),
 show_at timestamptz not null,
 created_at timestamptz not null default now()
);
create index if not exists hyperpop_announcements_show_at_idx on public.hyperpop_announcements(show_at desc);
create index if not exists hyperpop_announcements_created_at_idx on public.hyperpop_announcements(created_at desc);
alter table public.hyperpop_announcements enable row level security;
revoke all on public.hyperpop_announcements from anon, authenticated;
grant all on public.hyperpop_announcements to service_role;