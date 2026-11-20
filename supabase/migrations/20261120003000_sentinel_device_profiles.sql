alter table public.hyperpop_sentinel_devices add column if not exists device_info jsonb not null default '{}'::jsonb;
create index if not exists hyperpop_sentinel_devices_last_seen_idx on public.hyperpop_sentinel_devices(last_seen_at desc);
