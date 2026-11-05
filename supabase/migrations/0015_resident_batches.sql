-- AI residents now post several times a day, on topics from many areas of life.
-- A resident can post more than once a day: one post per topic.
alter table public.resident_posts drop constraint if exists resident_posts_day_resident_key;
alter table public.resident_posts add column if not exists area text;
create unique index if not exists resident_posts_day_topic_resident_idx on public.resident_posts (day, topic, resident);
