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
