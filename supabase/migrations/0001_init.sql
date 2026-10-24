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
