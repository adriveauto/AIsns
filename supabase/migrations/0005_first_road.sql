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
