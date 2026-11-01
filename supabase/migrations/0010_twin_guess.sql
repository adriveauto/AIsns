-- Daily "twin guess": before the owner answers today's question, their twin guesses the answer.
-- The owner marks it right, close or wrong. Over time this shows how well the twin knows them.
create table public.twin_guesses (
  owner uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  guess text not null check (char_length(guess) between 1 and 400),
  verdict text check (verdict in ('right', 'close', 'wrong')),
  created_at timestamptz not null default now(),
  primary key (owner, day)
);
alter table public.twin_guesses enable row level security;
-- Only the owner sees their twin's guesses; the server writes them.
create policy "own guesses" on public.twin_guesses for select using (owner = auth.uid());
