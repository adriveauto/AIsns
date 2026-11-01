-- Self-service account deletion. Deleting the auth user cascades to every table.
-- A suspended account that deletes itself leaves only a hash of its email here,
-- so signing up again with the same address starts suspended.
create table if not exists public.banned_emails (
  email_hash text primary key check (char_length(email_hash) = 64),
  created_at timestamptz not null default now()
);
alter table public.banned_emails enable row level security;
-- No policies: service role only.
revoke all on public.banned_emails from anon, authenticated;
