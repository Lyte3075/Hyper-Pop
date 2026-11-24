alter table public.hyperpop_announcements add column if not exists end_at timestamptz;
create index if not exists hyperpop_announcements_end_at_idx on public.hyperpop_announcements(end_at);
