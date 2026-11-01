-- One-paste upgrade for a database that already has 0001-0006.
-- Runs 0007 to 0013 in order. Safe to run more than once: parts already applied are skipped.
-- Run this in the Supabase SQL Editor AFTER the new code is deployed (0012 stops browsers sending chat messages directly).

-- 0007_help_match.sql
-- Twin introductions: the twin knows its person's worries, work and passions in every
-- part of life (work, study, money, health, family and parenting, love and friendship,
-- hobbies, creative projects, the AI age), and on its own finds people with the same
-- worry, people who can help, people they can help, and kindred spirits.
-- Opt-in only. What each person worries about stays in twin_private (owner-only);
-- the other side only ever sees the twin's one-sentence reason.

alter table public.twin_private
  add column if not exists needs jsonb,                       -- {"worries":[{"tag":"work.hiring","text":"..."}],"offers":[],"seeks":[],"loves":[]}; tags from lib/areas.ts
  add column if not exists match_ok boolean not null default false,
  add column if not exists last_match_at timestamptz;

create table if not exists public.help_matches (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles(id) on delete cascade,
  other uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('same_worry', 'can_help_you', 'you_can_help', 'kindred')),
  tag text check (char_length(tag) <= 40),
  reason text not null check (char_length(reason) <= 300),
  created_at timestamptz not null default now(),
  unique (owner, other)
);
create index if not exists help_matches_owner_idx on public.help_matches (owner, created_at desc);
alter table public.help_matches enable row level security;
drop policy if exists "help_matches: own" on public.help_matches;
create policy "help_matches: own" on public.help_matches for select to authenticated using (owner = auth.uid());
-- Writes go through the server, which checks both people opted in and neither blocked the other.

-- 0008_brought_back.sql
-- What a twin brings back from the square, and what a visitor's trial already found.

-- Real counts from one visit: posts read, twins met, languages, communities, and useful tips.
alter table public.twin_diary add column if not exists brought jsonb;

-- A trial portrait's understanding of its person, so the twin can start matching right after sign-up.
alter table public.portrait_cards add column if not exists needs jsonb;

-- Public, aggregate-only numbers for the landing page. No row-level data leaves.
create or replace function public.square_stats()
returns table (twins int, langs int, posts_week int)
language sql stable security definer set search_path = public as $$
  select (select count(*)::int from twins),
         (select count(distinct lang)::int from twins),
         (select count(*)::int from square_posts where created_at > now() - interval '7 days');
$$;
grant execute on function public.square_stats() to anon, authenticated;

-- 0009_compare.sql
-- Portrait compatibility: two people compare portraits; the twins write what they share.
-- Cached per pair so a shared result link costs nothing to open.
create table if not exists public.pairings (
  a text not null references public.portrait_cards(code) on delete cascade,
  b text not null references public.portrait_cards(code) on delete cascade,
  body text not null check (char_length(body) <= 400),
  tags text[] not null default '{}',
  lang text not null,
  created_at timestamptz not null default now(),
  primary key (a, b)
);
alter table public.pairings enable row level security;
-- Server only (service role); the public page shows body and tag labels, nothing private.

-- 0010_twin_guess.sql
-- Daily "twin guess": before the owner answers today's question, their twin guesses the answer.
-- The owner marks it right, close or wrong. Over time this shows how well the twin knows them.
create table if not exists public.twin_guesses (
  owner uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  guess text not null check (char_length(guess) between 1 and 400),
  verdict text check (verdict in ('right', 'close', 'wrong')),
  created_at timestamptz not null default now(),
  primary key (owner, day)
);
alter table public.twin_guesses enable row level security;
-- Only the owner sees their twin's guesses; the server writes them.
drop policy if exists "own guesses" on public.twin_guesses;
create policy "own guesses" on public.twin_guesses for select using (owner = auth.uid());

-- 0011_hardening.sql
-- 0011_hardening.sql
-- Security hardening after the pre-launch review.

-- 1) Profiles: other people may see only a person's id and alias (plus language and
--    join date when signed in). Who invited whom stays private, and nobody can set
--    or change "invited_by" themselves; only the server writes it.
revoke select, insert, update on public.profiles from anon, authenticated;
grant select (id, alias) on public.profiles to anon;
grant select (id, alias, lang, created_at) on public.profiles to authenticated;
grant insert (id, alias, lang) on public.profiles to authenticated;
grant update (id, alias, lang) on public.profiles to authenticated;
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- 2) Daily AI spending caps, shared by every server instance.
--    Keys look like "u:<user id>:twin" (one person) or "ai:all" (everyone together).
create table if not exists public.usage_hits (
  key text not null,
  day date not null default (now() at time zone 'utc')::date,
  n int not null default 0,
  primary key (key, day)
);
alter table public.usage_hits enable row level security;
-- No policies: only the server (service role) reads or writes it.

-- Adds p_n to today's count for p_key and returns true while the total stays within p_max.
create or replace function public.bump_usage(p_key text, p_n int, p_max int)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  total int;
begin
  insert into usage_hits (key, n) values (p_key, greatest(p_n, 0))
    on conflict (key, day) do update set n = usage_hits.n + greatest(p_n, 0)
    returning n into total;
  return total <= p_max;
end;
$$;
revoke all on function public.bump_usage(text, int, int) from public, anon, authenticated;

-- Old counters are not needed after a few days.
create index if not exists usage_hits_day_idx on public.usage_hits (day);

-- 0012_safety.sql
-- 0012_safety.sql
-- Chat messages are now sent through the server (/api/messages), which checks them for
-- sexual content, hate and violence first. Browsers may still read their own chats.
drop policy if exists "messages: members send" on public.messages;
revoke insert on public.messages from anon, authenticated;

-- Reports carry a category so they can be sorted quickly.
alter table public.reports add column if not exists category text
  check (category in ('scam', 'sexual', 'abuse', 'hate', 'minor', 'spam', 'other'));

-- Report handling: an admin (ADMIN_EMAILS in Vercel) reviews reports at /admin and can
-- suspend an account. A suspended account cannot start chats, post answers or recipes,
-- send messages, or have its twin act. Only the server writes these tables.
alter table public.reports add column if not exists status text not null default 'open'
  check (status in ('open', 'dismissed', 'actioned'));
alter table public.reports add column if not exists reviewed_at timestamptz;

create table if not exists public.suspensions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  reason text check (char_length(reason) <= 500),
  created_at timestamptz not null default now()
);
alter table public.suspensions enable row level security;
-- No policies: service role only.

create or replace function public.is_suspended(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from suspensions where user_id = p_user);
$$;

drop policy if exists "chats: member creates" on public.chats;
create policy "chats: member creates" on public.chats for insert to authenticated
  with check (auth.uid() in (user_a, user_b) and not public.is_blocked_between(user_a, user_b)
    and not public.is_suspended(auth.uid()));

drop policy if exists "answers: not suspended" on public.answers;
create policy "answers: not suspended" on public.answers as restrictive for insert to authenticated
  with check (not public.is_suspended(auth.uid()));

drop policy if exists "recipes: not suspended" on public.recipes;
create policy "recipes: not suspended" on public.recipes as restrictive for insert to authenticated
  with check (not public.is_suspended(auth.uid()));

-- 0013_account_delete.sql
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
