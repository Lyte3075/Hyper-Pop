create table if not exists public.hyperpop_voice_calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references public.hyperpop_accounts(id) on delete cascade,
  callee_id uuid not null references public.hyperpop_accounts(id) on delete cascade,
  status text not null default 'ringing' check (status in ('ringing','active','declined','ended','missed')),
  offer jsonb,
  answer jsonb,
  caller_ice jsonb not null default '[]'::jsonb,
  callee_ice jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 seconds',
  ended_at timestamptz,
  constraint hyperpop_voice_calls_distinct_users check (caller_id <> callee_id)
);
create index if not exists hyperpop_voice_calls_caller_active_idx on public.hyperpop_voice_calls(caller_id,status,created_at desc);
create index if not exists hyperpop_voice_calls_callee_active_idx on public.hyperpop_voice_calls(callee_id,status,created_at desc);
alter table public.hyperpop_voice_calls enable row level security;
revoke all on public.hyperpop_voice_calls from anon, authenticated;
