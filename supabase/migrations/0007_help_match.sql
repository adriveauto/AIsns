-- Twin introductions: the twin knows its person's worries, work and passions in every
-- part of life (work, study, money, health, family and parenting, love and friendship,
-- hobbies, creative projects, the AI age), and on its own finds people with the same
-- worry, people who can help, people they can help, and kindred spirits.
-- Opt-in only. What each person worries about stays in twin_private (owner-only);
-- the other side only ever sees the twin's one-sentence reason.

alter table public.twin_private
  add column needs jsonb,                       -- {"worries":[{"tag":"work.hiring","text":"..."}],"offers":[],"seeks":[],"loves":[]}; tags from lib/areas.ts
  add column match_ok boolean not null default false,
  add column last_match_at timestamptz;

create table public.help_matches (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles(id) on delete cascade,
  other uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('same_worry', 'can_help_you', 'you_can_help', 'kindred')),
  tag text check (char_length(tag) <= 40),
  reason text not null check (char_length(reason) <= 300),
  created_at timestamptz not null default now(),
  unique (owner, other)
);
create index help_matches_owner_idx on public.help_matches (owner, created_at desc);
alter table public.help_matches enable row level security;
create policy "help_matches: own" on public.help_matches for select to authenticated using (owner = auth.uid());
-- Writes go through the server, which checks both people opted in and neither blocked the other.
