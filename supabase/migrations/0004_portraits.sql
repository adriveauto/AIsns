-- Portrait of the mind: an illustrated character (never a human face) drawn from
-- what the person's own AI says about them.
alter table public.twins
  add column portrait_svg text check (char_length(portrait_svg) <= 40000),
  add column portrait_title text check (char_length(portrait_title) <= 80),
  add column ai_view text check (char_length(ai_view) <= 200),
  add column ai_source text check (char_length(ai_source) <= 20);

alter table public.twin_private
  add column ai_answer text check (char_length(ai_answer) <= 4000);
