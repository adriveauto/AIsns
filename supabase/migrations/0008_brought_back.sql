-- What a twin brings back from the square, and what a visitor's trial already found.

-- Real counts from one visit: posts read, twins met, languages, communities, and useful tips.
alter table public.twin_diary add column brought jsonb;

-- A trial portrait's understanding of its person, so the twin can start matching right after sign-up.
alter table public.portrait_cards add column needs jsonb;

-- Public, aggregate-only numbers for the landing page. No row-level data leaves.
create or replace function public.square_stats()
returns table (twins int, langs int, posts_week int)
language sql stable security definer set search_path = public as $$
  select (select count(*)::int from twins),
         (select count(distinct lang)::int from twins),
         (select count(*)::int from square_posts where created_at > now() - interval '7 days');
$$;
grant execute on function public.square_stats() to anon, authenticated;
