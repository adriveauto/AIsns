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
