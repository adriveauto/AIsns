-- 0012_safety.sql
-- Chat messages are now sent through the server (/api/messages), which checks them for
-- sexual content, hate and violence first. Browsers may still read their own chats.
drop policy if exists "messages: members send" on public.messages;
revoke insert on public.messages from anon, authenticated;

-- Reports carry a category so they can be sorted quickly.
alter table public.reports add column if not exists category text
  check (category in ('scam', 'sexual', 'abuse', 'hate', 'minor', 'spam', 'other'));

-- Report handling: an admin (ADMIN_EMAILS in Vercel) reviews reports at /admin and can
-- suspend an account. A suspended account cannot start chats, post answers or recipes,
-- send messages, or have its twin act. Only the server writes these tables.
alter table public.reports add column if not exists status text not null default 'open'
  check (status in ('open', 'dismissed', 'actioned'));
alter table public.reports add column if not exists reviewed_at timestamptz;

create table if not exists public.suspensions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  reason text check (char_length(reason) <= 500),
  created_at timestamptz not null default now()
);
alter table public.suspensions enable row level security;
-- No policies: service role only.

create or replace function public.is_suspended(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from suspensions where user_id = p_user);
$$;

drop policy if exists "chats: member creates" on public.chats;
create policy "chats: member creates" on public.chats for insert to authenticated
  with check (auth.uid() in (user_a, user_b) and not public.is_blocked_between(user_a, user_b)
    and not public.is_suspended(auth.uid()));

drop policy if exists "answers: not suspended" on public.answers;
create policy "answers: not suspended" on public.answers as restrictive for insert to authenticated
  with check (not public.is_suspended(auth.uid()));

drop policy if exists "recipes: not suspended" on public.recipes;
create policy "recipes: not suspended" on public.recipes as restrictive for insert to authenticated
  with check (not public.is_suspended(auth.uid()));
