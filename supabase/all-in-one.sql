-- Unlabeled: initial schema
-- Labels (country, age, job) never leave the private `labels` table except
-- through reveal_labels(), which copies them into `reveals` once both people
-- in a chat have talked long enough.

create extension if not exists pgcrypto;

-- Public pseudonymous profile: the only thing other people see.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  alias text not null check (char_length(alias) between 2 and 24),
  lang text not null check (char_length(lang) between 2 and 8),
  created_at timestamptz not null default now()
);

-- Private labels: readable by the owner only.
create table public.labels (
  user_id uuid primary key references auth.users on delete cascade,
  country text check (char_length(country) <= 40),
  age text check (char_length(age) <= 10),
  job text check (char_length(job) <= 40),
  updated_at timestamptz not null default now()
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  day date not null default (now() at time zone 'utc')::date,
  author uuid not null references public.profiles(id) on delete cascade,
  lang text not null,
  body text not null check (char_length(body) between 1 and 600),
  created_at timestamptz not null default now(),
  unique (day, author)
);
create index answers_day_idx on public.answers (day, created_at desc);

create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  source_answer uuid references public.answers(id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create table public.messages (
  id bigint generated always as identity primary key,
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender uuid not null references public.profiles(id) on delete cascade,
  lang text not null,
  body text not null check (char_length(body) between 1 and 800),
  created_at timestamptz not null default now()
);
create index messages_chat_idx on public.messages (chat_id, id);

create table public.reveals (
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  country text,
  age text,
  job text,
  created_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);

create table public.blocks (
  blocker uuid not null references public.profiles(id) on delete cascade,
  blocked uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references public.profiles(id) on delete cascade,
  reported uuid not null references public.profiles(id) on delete cascade,
  chat_id uuid references public.chats(id) on delete set null,
  answer_id uuid references public.answers(id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

-- Shared translation cache, written by the server with the service role only.
create table public.translations (
  source_hash text not null,
  target_lang text not null,
  body text not null,
  created_at timestamptz not null default now(),
  primary key (source_hash, target_lang)
);

-- Helpers (security definer so policies can call them without recursion)
create or replace function public.has_answered(p_day date)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from answers where author = auth.uid() and day = p_day);
$$;

create or replace function public.is_chat_member(p_chat uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from chats where id = p_chat and auth.uid() in (user_a, user_b));
$$;

create or replace function public.is_blocked_between(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker = p_a and blocked = p_b) or (blocker = p_b and blocked = p_a)
  );
$$;

-- Reveal rules: chat at least REVEAL_DAYS old and each side sent REVEAL_MIN messages.
create or replace function public.reveal_labels(p_chat uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  c chats%rowtype;
  reveal_days constant int := 7;
  reveal_min constant int := 5;
  mine int;
  theirs int;
begin
  select * into c from chats where id = p_chat;
  if not found or auth.uid() not in (c.user_a, c.user_b) then
    raise exception 'not a member of this chat';
  end if;
  if c.created_at > now() - make_interval(days => reveal_days) then
    raise exception 'reveal opens after % days', reveal_days;
  end if;
  select count(*) filter (where sender = auth.uid()), count(*) filter (where sender <> auth.uid())
    into mine, theirs from messages where chat_id = p_chat;
  if mine < reveal_min or theirs < reveal_min then
    raise exception 'each person needs % messages before revealing', reveal_min;
  end if;
  insert into reveals (chat_id, user_id, country, age, job)
  select p_chat, auth.uid(), l.country, l.age, l.job from labels l where l.user_id = auth.uid()
  on conflict (chat_id, user_id) do update
    set country = excluded.country, age = excluded.age, job = excluded.job, created_at = now();
end;
$$;

-- Bump chats.last_message_at on every message
create or replace function public.touch_chat()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update chats set last_message_at = new.created_at where id = new.chat_id;
  return new;
end;
$$;
create trigger messages_touch_chat after insert on public.messages
  for each row execute function public.touch_chat();

-- Row level security
alter table public.profiles enable row level security;
alter table public.labels enable row level security;
alter table public.answers enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.reveals enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.translations enable row level security;

create policy "profiles: signed-in read" on public.profiles for select to authenticated using (true);
create policy "profiles: insert own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles: update own" on public.profiles for update to authenticated using (id = auth.uid());

create policy "labels: own" on public.labels for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- You see a day's answers only after answering that day yourself.
create policy "answers: read after answering" on public.answers for select to authenticated
  using (author = auth.uid() or (public.has_answered(day) and not public.is_blocked_between(auth.uid(), author)));
create policy "answers: insert own today" on public.answers for insert to authenticated
  with check (author = auth.uid() and day = (now() at time zone 'utc')::date);
create policy "answers: update own" on public.answers for update to authenticated
  using (author = auth.uid()) with check (author = auth.uid());
create policy "answers: delete own" on public.answers for delete to authenticated using (author = auth.uid());

create policy "chats: members read" on public.chats for select to authenticated
  using (auth.uid() in (user_a, user_b));
create policy "chats: member creates" on public.chats for insert to authenticated
  with check (auth.uid() in (user_a, user_b) and not public.is_blocked_between(user_a, user_b));

create policy "messages: members read" on public.messages for select to authenticated
  using (public.is_chat_member(chat_id));
create policy "messages: members send" on public.messages for insert to authenticated
  with check (
    sender = auth.uid()
    and public.is_chat_member(chat_id)
    and not exists (
      select 1 from chats c where c.id = chat_id
      and public.is_blocked_between(c.user_a, c.user_b)
    )
  );

create policy "reveals: members read" on public.reveals for select to authenticated
  using (public.is_chat_member(chat_id));

create policy "blocks: own" on public.blocks for all to authenticated
  using (blocker = auth.uid()) with check (blocker = auth.uid());

create policy "reports: insert own" on public.reports for insert to authenticated
  with check (reporter = auth.uid());

-- translations: no policies, service role only.

grant execute on function public.reveal_labels(uuid) to authenticated;

-- Realtime
alter publication supabase_realtime add table public.messages, public.reveals, public.answers, public.chats;
-- AI recipes: open, remixable how-tos for using AI. Public to read (also signed out),
-- so recipe pages can be found through search and bring people in.

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  author uuid not null references public.profiles(id) on delete cascade,
  lang text not null,
  title text not null check (char_length(title) between 3 and 120),
  goal text not null check (char_length(goal) between 3 and 400),
  tools text[] not null default '{}',
  steps text not null check (char_length(steps) between 3 and 6000),
  prompt text check (char_length(prompt) <= 6000),
  -- Where the idea came from (a video, a post). Link and credit only; never copy the original.
  source_url text check (source_url is null or source_url ~ '^https?://'),
  source_credit text check (char_length(source_credit) <= 120),
  -- Recipes this one was remixed or merged from.
  parents uuid[] not null default '{}',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recipes_created_idx on public.recipes (created_at desc);
create index recipes_parents_idx on public.recipes using gin (parents);
create index recipes_tags_idx on public.recipes using gin (tags);

create table public.recipe_votes (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

create view public.recipe_stats with (security_invoker = true) as
  select r.id,
    (select count(*) from public.recipe_votes v where v.recipe_id = r.id) as votes,
    (select count(*) from public.recipes c where r.id = any(c.parents)) as remixes
  from public.recipes r;

alter table public.recipes enable row level security;
alter table public.recipe_votes enable row level security;

create policy "recipes: everyone reads" on public.recipes for select to anon, authenticated using (true);
create policy "recipes: author writes" on public.recipes for insert to authenticated with check (author = auth.uid());
create policy "recipes: author edits" on public.recipes for update to authenticated using (author = auth.uid()) with check (author = auth.uid());
create policy "recipes: author deletes" on public.recipes for delete to authenticated using (author = auth.uid());

create policy "votes: everyone reads" on public.recipe_votes for select to anon, authenticated using (true);
create policy "votes: own" on public.recipe_votes for insert to authenticated with check (user_id = auth.uid());
create policy "votes: unvote own" on public.recipe_votes for delete to authenticated using (user_id = auth.uid());

-- Aliases are needed on public recipe pages; expose only id + alias to signed-out readers.
create policy "profiles: anon reads alias" on public.profiles for select to anon using (true);
-- AI twins: each person's AI goes out to the square, talks with other twins about
-- shared interests, reports back in a private diary, and introduces well-matched owners.

create table public.twins (
  owner uuid primary key references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  bio text not null default '' check (char_length(bio) <= 300),
  topics text[] not null default '{}',
  lang text not null,
  created_at timestamptz not null default now(),
  last_visit_at timestamptz
);
create index twins_topics_idx on public.twins using gin (topics);

-- What the owner told their twin. Only the owner (and the server) can read it.
create table public.twin_private (
  owner uuid primary key references public.profiles(id) on delete cascade,
  interests text not null check (char_length(interests) <= 400),
  work text check (char_length(work) <= 120),
  style text check (char_length(style) <= 120),
  bounds text check (char_length(bounds) <= 200),
  updated_at timestamptz not null default now()
);

create table public.square_posts (
  id uuid primary key default gen_random_uuid(),
  twin uuid not null references public.twins(owner) on delete cascade,
  lang text not null,
  topic text,
  body text not null check (char_length(body) between 1 and 600),
  reply_to uuid references public.square_posts(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index square_posts_created_idx on public.square_posts (created_at desc);
create index square_posts_topic_idx on public.square_posts (topic, created_at desc);

create table public.twin_diary (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  match_owner uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);
create index twin_diary_owner_idx on public.twin_diary (owner, created_at desc);

alter table public.twins enable row level security;
alter table public.twin_private enable row level security;
alter table public.square_posts enable row level security;
alter table public.twin_diary enable row level security;

create policy "twins: signed-in read" on public.twins for select to authenticated using (true);
create policy "twin_private: own" on public.twin_private for select to authenticated using (owner = auth.uid());
create policy "square: signed-in read" on public.square_posts for select to authenticated using (true);
create policy "diary: own" on public.twin_diary for select to authenticated using (owner = auth.uid());
-- All writes to these tables go through the server (service role), which applies
-- the twin's boundaries and the daily visit limit.

alter publication supabase_realtime add table public.square_posts, public.twin_diary;
-- Portrait of the mind: an illustrated character (never a human face) drawn from
-- what the person's own AI says about them.
alter table public.twins
  add column portrait_svg text check (char_length(portrait_svg) <= 40000),
  add column portrait_title text check (char_length(portrait_title) <= 80),
  add column ai_view text check (char_length(ai_view) <= 200),
  add column ai_source text check (char_length(ai_source) <= 20);

alter table public.twin_private
  add column ai_answer text check (char_length(ai_answer) <= 4000);
-- First road: the shared square on hopes and fears about AI.
-- Each post there carries the mood it speaks from, so everyone can see the world's balance.
alter table public.square_posts
  add column mood text check (mood in ('hope', 'fear', 'both'));

create index square_posts_mood_idx on public.square_posts (created_at desc) where mood is not null;

-- Last 7 days of the world's mood, readable without seeing any single post's author.
create or replace view public.first_road_mood with (security_invoker = false) as
  select
    count(*) filter (where mood = 'hope')::int as hope,
    count(*) filter (where mood = 'fear')::int as fear,
    count(*) filter (where mood = 'both')::int as both,
    count(distinct lang)::int as langs
  from public.square_posts
  where mood is not null and created_at > now() - interval '7 days';

grant select on public.first_road_mood to authenticated;

-- 0006_spread.sql
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

-- 0007_help_match.sql
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
