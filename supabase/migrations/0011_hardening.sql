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
