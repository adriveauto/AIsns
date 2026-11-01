-- Portrait compatibility: two people compare portraits; the twins write what they share.
-- Cached per pair so a shared result link costs nothing to open.
create table public.pairings (
  a text not null references public.portrait_cards(code) on delete cascade,
  b text not null references public.portrait_cards(code) on delete cascade,
  body text not null check (char_length(body) <= 400),
  tags text[] not null default '{}',
  lang text not null,
  created_at timestamptz not null default now(),
  primary key (a, b)
);
alter table public.pairings enable row level security;
-- Server only (service role); the public page shows body and tag labels, nothing private.
