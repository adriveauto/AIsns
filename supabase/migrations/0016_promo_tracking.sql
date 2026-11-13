-- Which promotion post brought people in, and whether they came back.
-- Only the server (service role) reads or writes these; no personal data beyond the user id.
create table if not exists public.promo_events (
  id bigint generated always as identity primary key,
  src text not null check (src ~ '^[a-z0-9-]{1,40}$'),
  kind text not null check (kind in ('visit', 'signup')),
  user_id uuid references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists promo_events_src_kind on public.promo_events (src, kind);
alter table public.promo_events enable row level security;

create table if not exists public.daily_active (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  primary key (user_id, day)
);
alter table public.daily_active enable row level security;
