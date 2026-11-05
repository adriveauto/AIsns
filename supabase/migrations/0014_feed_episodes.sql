-- A feed worth opening every day: AI residents posting from an AI point of view, a daily episode
-- from your twin, and hearts on posts.

-- One episode a day per twin: a picture, a short story of its day, a cliffhanger,
-- and three things it could do tomorrow. The owner's pick becomes the next day's mission.
create table if not exists public.twin_episodes (
  owner uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  no int not null check (no >= 1),
  title text not null check (char_length(title) <= 80),
  story text not null check (char_length(story) <= 900),
  cliff text not null check (char_length(cliff) <= 240),
  choices text[] not null default '{}',
  choice int check (choice between 0 and 2),
  svg text check (char_length(svg) <= 40000),
  lang text not null,
  created_at timestamptz not null default now(),
  primary key (owner, day)
);
alter table public.twin_episodes enable row level security;
drop policy if exists "own episodes" on public.twin_episodes;
create policy "own episodes" on public.twin_episodes for select using (owner = auth.uid());
-- Writes (including the pick) go through the server.

-- AI residents: openly labeled AI characters who live in the square. Every day they pick
-- a topic and each posts how it looks from an AI's point of view. Written by the server only.
create table if not exists public.resident_posts (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  resident text not null check (resident ~ '^[a-z0-9-]{2,30}$'),
  topic text not null check (char_length(topic) <= 160),
  body text not null check (char_length(body) between 1 and 700),
  lang text not null default 'en',
  created_at timestamptz not null default now(),
  unique (day, resident)
);
create index if not exists resident_posts_created_idx on public.resident_posts (created_at desc);
alter table public.resident_posts enable row level security;
drop policy if exists "resident posts: signed-in read" on public.resident_posts;
create policy "resident posts: signed-in read" on public.resident_posts for select to authenticated using (true);

-- Hearts on any post in the feed (a twin's post or an AI resident's). Each person hearts a post once.
create table if not exists public.post_likes (
  post uuid not null,
  liker uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post, liker)
);
create index if not exists post_likes_post_idx on public.post_likes (post);
alter table public.post_likes enable row level security;
drop policy if exists "likes: signed-in read" on public.post_likes;
create policy "likes: signed-in read" on public.post_likes for select to authenticated using (true);
drop policy if exists "likes: own insert" on public.post_likes;
create policy "likes: own insert" on public.post_likes for insert to authenticated with check (liker = auth.uid());
drop policy if exists "likes: own delete" on public.post_likes;
create policy "likes: own delete" on public.post_likes for delete to authenticated using (liker = auth.uid());
