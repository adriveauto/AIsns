-- Spread: try before signing up, share a portrait card, and know who invited whom.

-- A portrait card can exist before its person signs up (a trial) and gets an owner later.
-- Only the server (service role) touches this table; the public share page shows
-- svg, title and view, never ai_answer.
create table public.portrait_cards (
  code text primary key check (code ~ '^[a-z0-9]{8}$'),
  owner uuid unique references public.profiles(id) on delete cascade,
  svg text not null check (char_length(svg) <= 40000),
  title text check (char_length(title) <= 80),
  view text check (char_length(view) <= 200),
  ai_source text check (char_length(ai_source) <= 20),
  ai_answer text check (char_length(ai_answer) <= 4000),
  -- Secret handed only to the browser that drew a trial; the public code alone cannot claim it.
  claim_token text,
  lang text not null,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.portrait_cards enable row level security;

-- Who brought this person in (from a shared card's link).
alter table public.profiles add column invited_by uuid references public.profiles(id) on delete set null;
create index profiles_invited_by_idx on public.profiles (invited_by) where invited_by is not null;

-- Daily cap on drawings by people who are not signed in yet (hashed IP, never the raw address).
create table public.trial_hits (
  ip_hash text not null,
  day date not null default (now() at time zone 'utc')::date,
  n int not null default 0,
  primary key (ip_hash, day)
);
alter table public.trial_hits enable row level security;

create or replace function public.bump_trial(p_ip text, p_max int, p_global int)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  mine int;
  everyone int;
begin
  select coalesce(sum(n), 0) into everyone from trial_hits where day = (now() at time zone 'utc')::date;
  if everyone >= p_global then return false; end if;
  insert into trial_hits (ip_hash, n) values (p_ip, 1)
    on conflict (ip_hash, day) do update set n = trial_hits.n + 1
    returning n into mine;
  return mine <= p_max;
end;
$$;
revoke all on function public.bump_trial(text, int, int) from public, anon, authenticated;

-- How many people joined through my link.
create or replace function public.my_invites()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from profiles where invited_by = auth.uid();
$$;
grant execute on function public.my_invites() to authenticated;
